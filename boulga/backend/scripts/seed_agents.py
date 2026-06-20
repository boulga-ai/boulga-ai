"""Seed script — pré-charge les 8 agents métier Boulga dans la table `agents`.

Usage :
    cd boulga/backend
    python scripts/seed_agents.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import get_supabase

AGENTS = [
    {
        "slug":        "service-client",
        "name":        "Agent Service Client",
        "description": (
            "Répond aux questions clients en français, gère les FAQ, "
            "escalade les demandes complexes."
        ),
        "icon":        "headset",
        "category":    "support",
        "active":      True,
    },
    {
        "slug":        "comptable-ohada",
        "name":        "Agent Comptable OHADA",
        "description": (
            "Comptabilité selon le plan comptable OHADA, génère états financiers "
            "et rapports de gestion."
        ),
        "icon":        "calculator",
        "category":    "finance",
        "active":      True,
    },
    {
        "slug":        "facturation",
        "name":        "Agent Facturation",
        "description": (
            "Génère devis et factures professionnels en FCFA, "
            "suit les paiements en retard."
        ),
        "icon":        "receipt",
        "category":    "finance",
        "active":      True,
    },
    {
        "slug":        "rh",
        "name":        "Agent RH",
        "description": (
            "Fiches de paie, contrats de travail, gestion des congés "
            "selon le droit local."
        ),
        "icon":        "users",
        "category":    "rh",
        "active":      True,
    },
    {
        "slug":        "marketing",
        "name":        "Agent Marketing",
        "description": (
            "Contenu Facebook, WhatsApp, Instagram adapté au marché africain. "
            "Campagnes et copies publicitaires."
        ),
        "icon":        "speakerphone",
        "category":    "marketing",
        "active":      True,
    },
    {
        "slug":        "reporting",
        "name":        "Agent Reporting",
        "description": (
            "Génère rapports automatiques depuis données brutes "
            "(Excel, CSV, JSON)."
        ),
        "icon":        "chart-bar",
        "category":    "analytics",
        "active":      True,
    },
    {
        "slug":        "juridique",
        "name":        "Agent Juridique",
        "description": (
            "Contrats simples, conformité OHADA, "
            "modèles de documents légaux."
        ),
        "icon":        "scale",
        "category":    "juridique",
        "active":      True,
    },
    {
        "slug":        "traducteur",
        "name":        "Agent Traducteur",
        "description": (
            "Français ↔ Anglais + Wolof, Dioula, Mooré. "
            "Traductions contextuelles adaptées au marché local."
        ),
        "icon":        "language",
        "category":    "traduction",
        "active":      True,
    },
]


def seed():
    db = get_supabase()
    inserted = 0
    skipped  = 0

    for agent in AGENTS:
        existing = (
            db.table("agents")
            .select("id")
            .eq("slug", agent["slug"])
            .maybe_single()
            .execute()
        )
        if existing.data:
            print(f"  [skip]   {agent['slug']} (existe déjà)")
            skipped += 1
            continue

        db.table("agents").insert(agent).execute()
        print(f"  [insert] {agent['slug']}")
        inserted += 1

    print(f"\n✓ {inserted} agent(s) insérés, {skipped} ignorés.")


if __name__ == "__main__":
    seed()
