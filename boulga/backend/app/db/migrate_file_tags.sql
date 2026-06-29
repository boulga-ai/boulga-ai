-- migrate_file_tags.sql — Backfill files.conversation_id / message_id depuis les
-- tags <!--file:{...}--> dans les messages, puis nettoyage des tags.
--
-- Prérequis : les colonnes conversation_id et message_id doivent déjà exister
-- sur la table files (cf. schema.sql).
--
-- Ordre de déploiement :
--   1. ALTER TABLE (ajouter colonnes) — fait via schema.sql
--   2. Déployer le backend (remplit les colonnes ET continue d'écrire les tags)
--   3. Exécuter CE script (backfill + nettoyage)
--   4. Déployer le frontend (lit l'API) + supprimer l'écriture des tags backend
--
-- Le script utilise regexp_matches (flag 'g') pour gérer les messages contenant
-- plusieurs tags (plusieurs fichiers générés dans une même réponse).

BEGIN;

-- ── Étape 1 : Backfill ──────────────────────────────────────────────────────
-- Extrait TOUS les tags de chaque message (pas seulement le premier),
-- puis met à jour files.conversation_id et files.message_id.

WITH tagged AS (
    SELECT
        m.id            AS msg_id,
        m.conversation_id,
        (match[1])::jsonb ->> 'id' AS file_id
    FROM messages m,
    LATERAL regexp_matches(m.content, '<!--file:(\{.*?\})-->', 'g') AS match
    WHERE m.content LIKE '%<!--file:%'
)
UPDATE files f
SET conversation_id = t.conversation_id,
    message_id      = t.msg_id
FROM tagged t
WHERE f.id::text = t.file_id
  AND f.conversation_id IS NULL;

-- ── Étape 2 : Vérification ──────────────────────────────────────────────────
-- Détecte les tags orphelins (référençant un fichier absent de la table files).
-- Si des orphelins existent, le script les signale et NE nettoie PAS ces messages.

DO $$
DECLARE
    orphan_count INT;
BEGIN
    SELECT count(*) INTO orphan_count
    FROM (
        SELECT (match[1])::jsonb ->> 'id' AS file_id
        FROM messages m,
        LATERAL regexp_matches(m.content, '<!--file:(\{.*?\})-->', 'g') AS match
        WHERE m.content LIKE '%<!--file:%'
    ) AS refs
    WHERE NOT EXISTS (
        SELECT 1 FROM files f WHERE f.id::text = refs.file_id
    );

    IF orphan_count > 0 THEN
        RAISE WARNING '% tag(s) orphelin(s) détecté(s) — fichier absent de la table files. '
                      'Ces messages ne seront PAS nettoyés. '
                      'Inspectez manuellement avec : '
                      'SELECT m.id, (match[1])::jsonb ->> ''id'' AS missing_file_id '
                      'FROM messages m, LATERAL regexp_matches(m.content, ''<!--file:(\\{.*?\\})-->'', ''g'') AS match '
                      'WHERE NOT EXISTS (SELECT 1 FROM files f WHERE f.id::text = (match[1])::jsonb ->> ''id'');',
                      orphan_count;
    END IF;
END $$;

-- ── Étape 3 : Nettoyage des tags ────────────────────────────────────────────
-- Ne nettoie QUE les messages dont TOUS les tags référencent des fichiers existants.

UPDATE messages m
SET content = regexp_replace(content, E'\n?<!--file:\\{.*?\\}-->', '', 'g')
WHERE m.content LIKE '%<!--file:%'
  AND NOT EXISTS (
    SELECT 1
    FROM regexp_matches(m.content, '<!--file:(\{.*?\})-->', 'g') AS match
    WHERE NOT EXISTS (
        SELECT 1 FROM files f WHERE f.id::text = (match[1])::jsonb ->> 'id'
    )
  );

COMMIT;
