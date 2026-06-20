# BOULGA — Contexte du projet

## Vision
Boulga (« puits » en mooré) est une plateforme IA à double mission :

**Mission 1 — Centralisation :** Regrouper les grands LLM (Gemini, Claude, ChatGPT, DeepSeek) en une seule interface unifiée pour permettre aux utilisateurs de profiter des forces de chaque modèle selon leur besoin — sans jongler entre plusieurs outils, comptes et abonnements. Chaque LLM a ses avantages ; Boulga les met tous à portée de main.

**Mission 2 — Accessibilité :** Rendre ces LLM accessibles là où les moyens de paiement internationaux (cartes Visa/Mastercard étrangères) et la barrière de la langue excluent les utilisateurs. Paiement en mobile money local (CinetPay/FCFA), interface en français, support adapté aux réalités locales. Le marché de lancement est l'Afrique de l'Ouest francophone ; la vision est mondiale.

Ces deux missions se renforcent : la centralisation apporte de la valeur à tous les utilisateurs ; l'accessibilité ouvre le marché à ceux qui en étaient exclus.

La plateforme a 3 sections : Hub LLM (chat multi-modèle — FOCUS de cette version), Marketplace d'Agents (B2B — à venir), Academy IA (formations — à venir). Cette première version construit la plateforme complète avec le Hub LLM entièrement fonctionnel.

Stratégie de lancement : La Marketplace d'Agents (section B2B future) et l'Academy n'apparaissent NULLE PART sur le site public (ni navigation, ni landing, ni footer). Elles seront annoncées uniquement au moment de leur lancement. L'objectif est de ne pas alerter les concurrents locaux sur la roadmap.

DISTINCTION IMPORTANTE sur les agents :
- Les "8 agents métier" sont une FONCTIONNALITÉ du plan Océan → visibles et détaillés sur la page /pricing uniquement.
- La "Marketplace d'Agents IA" est une future SECTION du produit → cachée, jamais mentionnée publiquement.
Un visiteur voit les agents comme un avantage du plan Océan, pas comme l'annonce d'un produit futur.

## Stack technique (NON négociable)
- Backend : FastAPI Python 3.12 (async)
- Frontend : Next.js 14 App Router + TypeScript strict
- Styling : Tailwind CSS
- État : Zustand
- Base de données : Supabase (PostgreSQL + Storage)
- Cache / quotas : Redis
- LLM : LiteLLM ou SDKs directs (google-genai pour Gemini). PAS google-generativeai (déprécié).
- Paiement : CinetPay (mobile money) + Stripe (international)
- Email : Resend
- Hébergement : Vercel (front) + Railway (back) + Cloudflare (CDN)
- Icônes : Tabler Icons (outline uniquement, 20px inline, 24px décoratif)

## Charte graphique (STRICTE)
Couleurs :
  Marine profond #0B1F3A — primaire, fonds, titres, texte principal
  Bleu Boulga #1565C0 — secondaire, actions, liens, CTA
  Fond neutre #F5F7FA — background interface
  Blanc #FFFFFF — surfaces, cards, inputs
  Texte secondaire #4A5568 — descriptions
  Texte tertiaire #94A3B8 — labels, placeholders
  Succès #2E7D32 — validation, paiement réussi
  Attention #F57C00 — quota proche, expiration
  Erreur #C62828 — échec, suppression
  Info #1565C0
  Ratio : 60% blanc/fond, 30% marine, 10% bleu
Typographie :
  Titres / H1 / display : DM Serif Display Regular 400 (Google Fonts)
  Interface / corps : DM Sans 300/400/500 (Google Fonts)
  Display 36px, H1 26px, H2 18px, Corps 15px, UI 13-14px, Caption 12px
Espacements : multiples de 4px (4, 8, 12, 16, 24, 48)
Rayons : inputs/badges 4px, boutons 8px, cards 12px, modales 16px, tags pill
Bordure par défaut : 0.5px solid #E0E4EC
Animations : 100ms rapide, 200ms ease-in-out standard, 350ms expressif
Voix de marque : directe, chaleureuse, concrète, sans jargon, inclusive.

## LLM et modèles (juin 2026)
Pour chaque LLM : un modèle économique (low) et un avancé (high).
- Gemini : gemini-2.5-flash (low), gemini-2.5-pro (high) — ACTIF
- Claude : claude-haiku-4-5 (low), claude-sonnet-4-6 (high) — à venir
- ChatGPT : gpt-5.5-instant (low), gpt-5.5-pro (high) — à venir
- DeepSeek : deepseek-v4-flash (low), deepseek-v4-pro (high) — à venir
Seul Gemini est actif au lancement. Les autres sont déclarés mais inactifs.

## Features différenciantes (avantages exclusifs Boulga)

### Mode Comparaison
L'utilisateur envoie un message et reçoit les réponses de plusieurs LLM côte à côte simultanément.
Il voit concrètement les différences entre Gemini, Claude, ChatGPT, DeepSeek sur la même question.
Disponible à partir de l'offre Source. Interface en colonnes (desktop) ou en onglets (mobile).

### Routage Automatique Intelligent
Boulga analyse la question et choisit automatiquement le LLM le plus adapté :
- Code / développement → DeepSeek V4
- Raisonnement / analyse / juridique → Claude Sonnet
- Créativité / rédaction → ChatGPT 5.5
- Fichiers longs / PDF / recherche → Gemini 2.5 Flash
- Questions générales → Gemini 2.5 Flash (défaut)
L'utilisateur peut activer/désactiver ce mode. Disponible à partir de Source.

### Support langues locales
Détection automatique de la langue de l'utilisateur.
Support prioritaire : Français, Anglais, Wolof, Dioula, Mooré, Bambara.
L'interface est en français. Les LLM répondent dans la langue détectée si supportée.

### Bot WhatsApp
Intégration WhatsApp Business API : l'utilisateur envoie un message à un numéro Boulga
et reçoit la réponse du LLM directement dans WhatsApp. Aucune app à installer.
Canal d'acquisition et de rétention prioritaire pour le marché africain.
Disponible à partir de Source.

### PWA (Progressive Web App)
L'application web est installable sur Android et iOS sans passer par les stores.
Fonctionne en mode dégradé sur connexion lente (importante en Afrique de l'Ouest).

## Abonnements (5 niveaux)
Monnaie : FCFA partout. Deux modes de facturation : mensuel ou annuel (2 mois offerts).

### Gratuit — 0 FCFA
- 10 messages/jour (≈ 300/mois)
- LLM : Gemini Flash uniquement
- Modèles : éco seulement
- Fichiers : non
- Agents : non
- Historique : 7 jours
- Sièges : 1
- Rôle : acquisition et test de la plateforme

### Goutte — 2 999 FCFA/mois | 29 990 FCFA/an
- 600 messages/mois
- LLM : Gemini + DeepSeek
- Modèles : éco seulement
- Fichiers : 3 uploads/mois
- Agents : non
- Historique : 3 mois
- Sièges : 1
- Rôle : entrée payante, étudiant, primo-utilisateur

### Source ⭐ (offre principale) — 5 999 FCFA/mois | 59 990 FCFA/an
- 800 messages/mois
- LLM : tous (Gemini, Claude, ChatGPT, DeepSeek)
- Modèles : éco + avancés
- Fichiers : 20 uploads/mois
- Mode Comparaison : oui
- Routage Automatique : oui
- Bot WhatsApp : oui
- Agents : non
- Historique : 1 an
- Sièges : 1
- Rôle : freelance, professionnel solo — majorité des revenus

### Fleuve — 9 999 FCFA/mois | 99 990 FCFA/an
- 2 000 messages/mois
- LLM : tous
- Modèles : tous (éco + avancés)
- Fichiers : 50 uploads/mois
- Mode Comparaison : oui
- Routage Automatique : oui
- Bot WhatsApp : oui
- Agents : 2 agents au choix parmi les 8
- Historique : illimité
- Sièges : 1
- Rôle : power user, manager, PME solo

### Océan — 29 999 FCFA/mois | 299 990 FCFA/an
- Messages : illimité (cap fair use 50M tokens/mois)
- LLM : tous
- Modèles : tous (éco + avancés)
- Fichiers : illimité
- Mode Comparaison : oui
- Routage Automatique : oui
- Bot WhatsApp : oui
- Agents : 8 agents métier inclus + création d'agents personnalisés
- Historique : illimité
- Sièges : 10
- API access : oui
- Tableau de bord admin : oui (usage par membre)
- Facturation annuelle avec reçu officiel : oui
- Support prioritaire (réponse < 24h) : oui
- Rôle : entreprise, équipe, B2B

## Programme de parrainage
Mécanisme : l'utilisateur A partage son lien unique → l'utilisateur B s'inscrit via ce lien
→ l'utilisateur B souscrit à n'importe quel abonnement payant
→ l'utilisateur A reçoit automatiquement 14 jours d'accès Goutte gratuit.

Règles :
- La récompense est déclenchée uniquement lors du PREMIER paiement réussi du filleul.
- Délai de sécurité : la récompense est accordée 7 jours après le paiement du filleul.
  Si le filleul demande un remboursement dans ces 7 jours → récompense annulée, jamais accordée.
- Récompense proportionnelle au tier souscrit par le filleul :
    Filleul souscrit Goutte  → parrain reçoit 14 jours Goutte
    Filleul souscrit Source  → parrain reçoit 1 mois Goutte
    Filleul souscrit Fleuve  → parrain reçoit 1 mois Source
    Filleul souscrit Océan   → parrain reçoit 1 mois Fleuve
- Si A est déjà sur un niveau supérieur à la récompense : les jours s'ajoutent à son expiration.
- Si A est sur Gratuit : il monte temporairement au niveau récompensé, puis retourne en Gratuit.
- Pas de limite de parrainages : chaque filleul payant = une récompense pour A.
- Anti-fraude : un utilisateur ne peut pas se parrainer lui-même (vérification email + IP + device).
- Un filleul ne peut être lié qu'à un seul parrain (premier lien de parrainage utilisé à l'inscription).

Canaux de partage (par ordre de priorité) :
1. WhatsApp — bouton "Partager sur WhatsApp" avec message pré-rédigé + lien
2. Copier le lien — pour tout autre canal (SMS, Facebook, email manuel)
3. Email direct — champ "Inviter par email" qui envoie un email depuis Boulga (Resend)
Notification de récompense à A : WhatsApp si compte lié, email sinon (fallback automatique).

Table DB : referrals (id, referrer_id FK users, referred_id FK users,
            status CHECK pending|completed, reward_granted_at, created_at)
Champ additionnel sur users : referral_code VARCHAR UNIQUE (généré à l'inscription).

## Agents métier (Océan uniquement)
8 agents pré-configurés pour les entreprises d'Afrique de l'Ouest :
1. Agent Service Client — répond aux questions clients en français, gère FAQ, escalade
2. Agent Comptable OHADA — comptabilité selon plan comptable OHADA, états financiers
3. Agent Facturation — génère devis et factures en FCFA, suit les paiements en retard
4. Agent RH — fiches de paie, contrats de travail, gestion congés selon droit local
5. Agent Marketing — contenu Facebook/WhatsApp/Instagram adapté au marché africain
6. Agent Reporting — génère rapports automatiques depuis données brutes (Excel, CSV)
7. Agent Juridique — contrats simples, conformité OHADA, modèles documents légaux
8. Agent Traducteur — Français ↔ Anglais + Wolof, Dioula, Mooré (si LLM supporté)
Fleuve : 2 agents au choix. Océan : les 8 + agents personnalisés illimités.

## Authentification
Inscription simple : email, nom complet, date de naissance, mot de passe.
Connexion : email + mot de passe → JWT en cookie httpOnly.

## Conventions de code
- Séparation stricte : routers → services → managers → repositories. Jamais de logique métier dans les routers.
- Noms de fichiers et variables en anglais ; commentaires et textes UI en français.
- Typage strict (Pydantic backend, TypeScript frontend).
- Secrets via .env, jamais dans le code.

## Structure des dossiers
boulga/
  backend/
    main.py
    app/
      config.py
      core/           (cors, exceptions, security, rate_limiter)
      db/             (session, schema.sql, repositories/)
      routers/        (auth, chat, conversations, files, llms, payments,
                       subscriptions, feedback, search, compare, whatsapp)
      schemas/        (auth, chat, compare, payment, subscription)
      services/       (auth_service, chat_service, file_service,
                       compare_service, routing_service, quota_service,
                       subscription_service, payment_service, whatsapp_service)
      manager/        (registry, llm_manager, providers/, router_agent)
      prompts/        (chat_prompts, tool_prompts, routing_prompts)
      utils/          (sse, languages, tokens)
  frontend/
    app/
      (layout, page)
      chat/           (page, [id]/page)
      auth/           (login, register, forgot)
      documents/      (page)
      settings/       (page)
      pricing/        (page)
      compare/        (page — Mode Comparaison)
    components/
      nav/            (Navigation)
      sidebar-left/   (ConversationList)
      chat/           (ChatWindow, MessageBubble, ChatInput, LLMSelector,
                       ComparePanel, RoutingIndicator)
      sidebar-right/  (DocumentPanel)
      ui/             (Button, Badge, Input, Card, Toast, Modal,
                       LangSelector, QuotaBadge)
    store/            (chatStore, authStore, docStore, compareStore)
    lib/              (api, stream, constants, languages)
    types/            (index — tous les types TypeScript)

## Ce qu'il NE faut PAS faire
- Ne pas ajouter de fonctionnalités non demandées.
- Ne pas utiliser localStorage/sessionStorage.
- Ne pas mettre de logique métier dans les routers.
- Ne pas coder les providers LLM autres que Gemini tant qu'on ne le demande pas.
- Ne pas inventer de clés API — utiliser les variables d'environnement.
- Ne pas hardcoder de sections de document (le LLM décide de la structure).
- Ne pas construire de convertisseur de fichiers côté backend — le LLM génère les fichiers.
- Ne jamais mentionner la Marketplace d'Agents ou l'Academy sur aucune page publique — ni nav, ni landing, ni footer, ni metadata SEO.
- Les 8 agents métier du plan Océan sont mentionnés UNIQUEMENT sur la page /pricing comme feature du plan — jamais comme section ou produit séparé.
- Ne pas afficher "illimité" sans cap technique côté backend — toujours avoir un fair use limit.
- Ne pas laisser un utilisateur Océan dépasser 50M tokens/mois sans alerte admin.
- Ne pas appeler plusieurs LLM en parallèle (Mode Comparaison) sans gérer les timeouts individuellement.
- Ne pas exposer les coûts API réels à l'utilisateur — afficher seulement les quotas en messages/tokens.
