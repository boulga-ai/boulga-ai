"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconBrandWhatsapp,
  IconCopy,
  IconCheck,
  IconLock,
  IconUsers,
  IconRobot,
  IconPhone,
  IconUnlink,
  IconPlus,
  IconSend,
  IconGift,
  IconClock,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { API_URL } from "@/lib/constants";
import { getAgents, getMyAgents, assignAgent, unassignAgent, getReferralStats, sendReferralInvite } from "@/lib/api";
import type { Agent, UserAgent, ReferralStats } from "@/types";

// Icônes par slug agent (Tabler icon names → mapping manuel)
const AGENT_ICONS: Record<string, React.ReactNode> = {
  "service-client":  <IconUsers size={18} className="text-blue-700" />,
  "comptable-ohada": <IconRobot size={18} className="text-blue-700" />,
  "facturation":     <IconRobot size={18} className="text-blue-700" />,
  "rh":              <IconUsers size={18} className="text-blue-700" />,
  "marketing":       <IconRobot size={18} className="text-blue-700" />,
  "reporting":       <IconRobot size={18} className="text-blue-700" />,
  "juridique":       <IconRobot size={18} className="text-blue-700" />,
  "traducteur":      <IconRobot size={18} className="text-blue-700" />,
};

// Données statiques — branchées avec les vraies données au prompt 12
const STUB_USER = {
  name: "Aymar Ouédraogo",
  email: "aymar@example.com",
  birthdate: "1990-01-01",
  plan: "Gratuit",
  planKey: "gratuit",
  billingCycle: null as string | null,
  expiresAt: null as string | null,
  messagesUsed: 7,
  messagesTotal: 10,
  messagesLabel: "aujourd'hui",
  filesUsed: 0,
  filesTotal: 0,
  referralCode: "BOULGA-AY42",
  referralCount: 0,
  locale: "fr",
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-white border border-neutral-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-border">
        <h2 className="text-h2 font-body font-medium text-marine">{title}</h2>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color =
    pct >= 90
      ? "bg-error"
      : pct >= 70
      ? "bg-warning"
      : "bg-blue-700";

  return (
    <div className="w-full h-1.5 bg-neutral-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-200 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Section Agents ────────────────────────────────────────────────────────────

function AgentsSection({
  tier,
  isFleuePlus,
  isOcean,
}: {
  tier: string;
  isFleuePlus: boolean;
  isOcean: boolean;
}) {
  const [agents, setAgents]         = useState<Agent[]>([]);
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!isFleuePlus) return;
    setLoading(true);
    Promise.all([getAgents(), getMyAgents()])
      .then(([all, mine]) => {
        setAgents(all);
        setUserAgents(mine);
      })
      .catch(() => setError("Impossible de charger les agents."))
      .finally(() => setLoading(false));
  }, [isFleuePlus]);

  const assignedIds = new Set(userAgents.map((ua) => ua.agent_id));

  async function handleToggle(agentId: string) {
    setError(null);
    if (assignedIds.has(agentId)) {
      try {
        await unassignAgent(agentId);
        setUserAgents((prev) => prev.filter((ua) => ua.agent_id !== agentId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    } else {
      try {
        const ua = await assignAgent(agentId);
        setUserAgents((prev) => [...prev, ua]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    }
  }

  return (
    <SectionCard title="Agents métier">
      <div className={!isFleuePlus ? "opacity-50 pointer-events-none select-none" : ""}>
        {isFleuePlus && (
          <p className="text-caption font-body text-neutral-text-secondary mb-4">
            {isOcean
              ? "Tous les agents sont actifs pour votre plan Océan."
              : `Sélectionnez 2 agents parmi les 8 disponibles (${userAgents.length}/2 sélectionné${userAgents.length !== 1 ? "s" : ""}).`}
          </p>
        )}

        {loading && (
          <p className="text-ui font-body text-neutral-text-tertiary">Chargement…</p>
        )}

        {error && (
          <p className="text-caption font-body text-error mb-3">{error}</p>
        )}

        {!loading && agents.length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            {agents.map((agent) => {
              const isAssigned = isOcean || assignedIds.has(agent.id);
              const canAssign  = isOcean || isAssigned || userAgents.length < 2;

              return (
                <button
                  key={agent.id}
                  onClick={() => !isOcean && handleToggle(agent.id)}
                  disabled={isOcean || (!isAssigned && !canAssign)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors duration-100
                    ${isAssigned
                      ? "border-blue-700 bg-blue-50"
                      : canAssign
                      ? "border-neutral-border hover:bg-neutral-bg"
                      : "border-neutral-border opacity-40 cursor-not-allowed"
                    }`}
                >
                  <span className="flex-shrink-0">
                    {AGENT_ICONS[agent.slug] ?? <IconRobot size={18} className="text-blue-700" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-ui font-body font-medium text-marine truncate">
                      {agent.name}
                    </p>
                    {agent.description && (
                      <p className="text-[11px] font-body text-neutral-text-tertiary truncate">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  {isAssigned && (
                    <IconCheck size={14} className="flex-shrink-0 text-blue-700" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isOcean && (
          <button
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-neutral-border text-marine text-ui font-body font-medium rounded-md hover:bg-neutral-bg transition-colors duration-100"
            disabled
            title="Bientôt disponible"
          >
            <IconPlus size={16} />
            Créer un agent personnalisé
          </button>
        )}
      </div>

      {!isFleuePlus && (
        <div className="mt-3 flex items-center gap-2">
          <IconLock size={14} className="text-neutral-text-tertiary" />
          <span className="text-caption font-body text-neutral-text-tertiary">
            Disponible à partir du plan{" "}
            <Link href="/pricing" className="text-blue-700 hover:underline">
              Fleuve
            </Link>
          </span>
        </div>
      )}
    </SectionCard>
  );
}

// ── Section Parrainage ────────────────────────────────────────────────────────

const REWARD_LABELS: Record<string, string> = {
  goutte: "14 jours Goutte offerts",
  source: "1 mois Goutte offerts",
  fleuve: "1 mois Source offerts",
  ocean:  "1 mois Fleuve offerts",
};

function ReferralSection() {
  const [stats, setStats]         = useState<ReferralStats | null>(null);
  const [copied, setCopied]       = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting]   = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    getReferralStats()
      .then(setStats)
      .catch(() => {/* silencieux — le lien se charge en fallback */});
  }, []);

  const referralLink = stats?.referral_link ?? "";

  function handleCopy() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const whatsappText = encodeURIComponent(
    `Rejoins Boulga, la plateforme IA pour l'Afrique 🌍 — ${referralLink}`,
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setError(null);
    setInviteSent(false);
    try {
      await sendReferralInvite(inviteEmail);
      setInviteSent(true);
      setInviteEmail("");
      setTimeout(() => setInviteSent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setInviting(false);
    }
  }

  return (
    <SectionCard title="Parrainage">
      <div className="space-y-5">
        {/* Description */}
        <p className="text-body text-neutral-text-secondary">
          Partagez votre lien unique. Pour chaque ami qui souscrit un plan payant,
          vous gagnez des jours d'accès automatiquement — sans limite.
        </p>

        {/* Tableau des récompenses */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(REWARD_LABELS).map(([tier, label]) => (
            <div
              key={tier}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-bg border border-neutral-border rounded-lg"
            >
              <IconGift size={14} className="flex-shrink-0 text-blue-700" />
              <div>
                <p className="text-[11px] font-body font-medium text-marine capitalize">{tier}</p>
                <p className="text-[11px] font-body text-neutral-text-secondary">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lien de parrainage */}
        <div>
          <p className="text-ui font-body font-medium text-marine mb-2">Votre lien</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 px-3 border border-neutral-border rounded-md text-ui font-body text-neutral-text-secondary bg-neutral-bg flex items-center truncate">
              {referralLink || "Chargement…"}
            </div>
            <button
              onClick={handleCopy}
              disabled={!referralLink}
              className="flex-shrink-0 flex items-center gap-2 h-10 px-3 border border-neutral-border text-marine text-ui font-body rounded-md hover:bg-neutral-bg transition-colors duration-100 disabled:opacity-40"
              title="Copier le lien"
            >
              {copied ? (
                <IconCheck size={16} className="text-success" />
              ) : (
                <IconCopy size={16} />
              )}
              <span className="hidden sm:inline">{copied ? "Copié !" : "Copier"}</span>
            </button>
          </div>
        </div>

        {/* Partager sur WhatsApp */}
        {referralLink && (
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-success text-neutral-white text-ui font-body font-medium rounded-md hover:opacity-90 transition-opacity duration-100"
          >
            <IconBrandWhatsapp size={18} />
            Partager sur WhatsApp
          </a>
        )}

        {/* Invitation par email */}
        <form onSubmit={handleInvite} className="space-y-2">
          <p className="text-ui font-body font-medium text-marine">Inviter par email</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="ami@exemple.com"
              className="flex-1 h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="flex-shrink-0 inline-flex items-center gap-2 h-10 px-4 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-md hover:bg-blue-900 transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {inviteSent ? (
                <IconCheck size={16} />
              ) : (
                <IconSend size={16} />
              )}
              <span>{inviting ? "Envoi…" : inviteSent ? "Envoyé !" : "Envoyer"}</span>
            </button>
          </div>
          {error && <p className="text-caption font-body text-error">{error}</p>}
        </form>

        {/* Statistiques */}
        {stats && (
          <div className="pt-4 border-t border-neutral-border space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <IconUsers size={16} className="text-neutral-text-tertiary" />
                <span className="text-ui font-body text-neutral-text-secondary">
                  <span className="text-marine font-medium">{stats.total_referrals}</span> filleul{stats.total_referrals !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheck size={16} className="text-success" />
                <span className="text-ui font-body text-neutral-text-secondary">
                  <span className="text-marine font-medium">{stats.completed_count}</span> récompensé{stats.completed_count !== 1 ? "s" : ""}
                </span>
              </div>
              {stats.pending_count > 0 && (
                <div className="flex items-center gap-2">
                  <IconClock size={16} className="text-warning" />
                  <span className="text-ui font-body text-neutral-text-secondary">
                    <span className="text-marine font-medium">{stats.pending_count}</span> en attente
                  </span>
                </div>
              )}
            </div>

            {/* Historique */}
            {stats.history.length > 0 && (
              <div className="space-y-1.5">
                {stats.history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-1.5 px-3 bg-neutral-bg border border-neutral-border rounded-md"
                  >
                    <span className="text-caption font-body text-marine truncate max-w-[140px]">
                      {item.referred_name}
                    </span>
                    <span
                      className={`text-[11px] font-body font-medium px-2 py-0.5 rounded-full ${
                        item.status === "completed"
                          ? "bg-green-50 text-success"
                          : item.status === "pending"
                          ? "bg-orange-50 text-warning"
                          : "bg-neutral-bg text-neutral-text-tertiary"
                      }`}
                    >
                      {item.status === "completed"
                        ? "Récompensé"
                        : item.status === "pending"
                        ? "En attente"
                        : "Annulé"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Section WhatsApp ──────────────────────────────────────────────────────────

type WaStep = "idle" | "enter-phone" | "enter-code" | "linked";

function WhatsAppSection({ isSourcePlus }: { isSourcePlus: boolean }) {
  const [step, setStep] = useState<WaStep>("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.startsWith("+")) {
      setError("Le numéro doit commencer par + (ex: +22670123456)");
      return;
    }
    setLoading(true);
    try {
      const token = useAuthStore.getState().getToken();
      const res = await fetch(`${API_URL}/api/whatsapp/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone_number: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur lors de l'envoi");
      setStep("enter-code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = useAuthStore.getState().getToken();
      const res = await fetch(`${API_URL}/api/whatsapp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Code invalide");
      setLinkedPhone(data.phone ?? phone);
      setStep("linked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink() {
    setLoading(true);
    try {
      const token = useAuthStore.getState().getToken();
      await fetch(`${API_URL}/api/whatsapp/unlink`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setLinkedPhone(null);
      setPhone("");
      setCode("");
      setStep("idle");
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Bot WhatsApp">
      <div className={!isSourcePlus ? "opacity-50 pointer-events-none select-none" : ""}>
        <p className="text-body text-neutral-text-secondary mb-4">
          Liez votre numéro WhatsApp pour utiliser Boulga directement depuis
          l'application de messagerie — sans application supplémentaire.
        </p>

        {step === "idle" && !linkedPhone && (
          <button
            onClick={() => { setStep("enter-phone"); setError(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-border text-marine text-ui font-body font-medium rounded-md hover:bg-neutral-bg transition-colors duration-100"
          >
            <IconBrandWhatsapp size={18} />
            Lier mon numéro WhatsApp
          </button>
        )}

        {step === "enter-phone" && (
          <form onSubmit={handleSendCode} className="space-y-3 max-w-sm">
            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Numéro WhatsApp
              </label>
              <div className="flex items-center gap-2">
                <IconPhone size={16} className="text-neutral-text-tertiary flex-shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+22670123456"
                  className="flex-1 h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                />
              </div>
              <p className="text-caption font-body text-neutral-text-tertiary mt-1">
                Format international requis (ex: +22670123456)
              </p>
            </div>
            {error && <p className="text-caption font-body text-error">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !phone}
                className="px-4 py-2 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-md hover:bg-blue-900 transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Envoi en cours…" : "Envoyer le code"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("idle"); setError(null); }}
                className="px-4 py-2 border border-neutral-border text-marine text-ui font-body font-medium rounded-md hover:bg-neutral-bg transition-colors duration-100"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {step === "enter-code" && (
          <form onSubmit={handleVerifyCode} className="space-y-3 max-w-sm">
            <p className="text-body text-neutral-text-secondary">
              Un code à {6} chiffres a été envoyé sur WhatsApp au numéro{" "}
              <span className="font-medium text-marine">{phone}</span>.
            </p>
            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Code de vérification
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-40 h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent tracking-widest text-center"
              />
            </div>
            {error && <p className="text-caption font-body text-error">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="px-4 py-2 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-md hover:bg-blue-900 transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Vérification…" : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("enter-phone"); setError(null); setCode(""); }}
                className="px-4 py-2 border border-neutral-border text-marine text-ui font-body font-medium rounded-md hover:bg-neutral-bg transition-colors duration-100"
              >
                Modifier le numéro
              </button>
            </div>
          </form>
        )}

        {(step === "linked" || linkedPhone) && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-bg border border-neutral-border rounded-md">
              <IconBrandWhatsapp size={18} className="text-success" />
              <span className="text-ui font-body text-marine font-medium">
                {linkedPhone}
              </span>
              <IconCheck size={14} className="text-success" />
            </div>
            <button
              onClick={handleUnlink}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-error text-error text-ui font-body font-medium rounded-md hover:bg-red-50 transition-colors duration-100 disabled:opacity-40"
            >
              <IconUnlink size={16} />
              Déconnecter
            </button>
          </div>
        )}
      </div>

      {!isSourcePlus && (
        <div className="mt-3 flex items-center gap-2">
          <IconLock size={14} className="text-neutral-text-tertiary" />
          <span className="text-caption font-body text-neutral-text-tertiary">
            Disponible à partir du plan{" "}
            <Link href="/pricing" className="text-blue-700 hover:underline">
              Source
            </Link>
          </span>
        </div>
      )}
    </SectionCard>
  );
}

// ── SettingsPage ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const authLogout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(STUB_USER.name);
  const [birthdate, setBirthdate] = useState(STUB_USER.birthdate);
  const [locale, setLocale] = useState(STUB_USER.locale);
  const [saved, setSaved] = useState(false);

  const planLevel = ["gratuit", "goutte", "source", "fleuve", "ocean"].indexOf(
    STUB_USER.planKey
  );
  const isSourcePlus = planLevel >= 2;
  const isFleuePlus = planLevel >= 3;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const planBadgeColor: Record<string, string> = {
    gratuit: "bg-neutral-bg text-neutral-text-secondary border border-neutral-border",
    goutte: "bg-blue-50 text-blue-700",
    source: "bg-blue-700 text-neutral-white",
    fleuve: "bg-marine text-neutral-white",
    ocean: "bg-marine text-neutral-white",
  };

  return (
    <div className="h-full overflow-y-auto bg-neutral-bg">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="mb-2">
          <h1 className="text-h1 font-display text-marine">Paramètres</h1>
        </div>

        {/* Profil */}
        <SectionCard title="Profil">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow duration-100"
              />
            </div>
            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Email
              </label>
              <input
                type="email"
                value={STUB_USER.email}
                disabled
                className="w-full h-10 px-3 border border-neutral-border rounded-md text-body font-body text-neutral-text-tertiary bg-neutral-bg cursor-not-allowed"
              />
              <p className="text-caption font-body text-neutral-text-tertiary mt-1">
                L'email n'est pas modifiable.
              </p>
            </div>
            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow duration-100"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-md hover:bg-blue-900 transition-colors duration-100"
              >
                {saved ? (
                  <>
                    <IconCheck size={16} />
                    Enregistré
                  </>
                ) : (
                  "Enregistrer"
                )}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Abonnement */}
        <SectionCard title="Abonnement">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-ui font-body text-neutral-text-secondary">
                Plan actuel :
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-ui font-body font-medium ${
                  planBadgeColor[STUB_USER.planKey]
                }`}
              >
                {STUB_USER.plan}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ui font-body text-neutral-text-secondary">
                Facturation :
              </span>
              <span className="text-ui font-body text-marine">
                {STUB_USER.billingCycle ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ui font-body text-neutral-text-secondary">
                Expiration :
              </span>
              <span className="text-ui font-body text-marine">
                {STUB_USER.expiresAt ?? "—"}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-flex items-center px-4 py-2 border border-neutral-border text-marine text-ui font-body font-medium rounded-md hover:bg-neutral-bg transition-colors duration-100"
              >
                Changer de plan
              </Link>
            </div>
          </div>
        </SectionCard>

        {/* Quota */}
        <SectionCard title="Utilisation">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-ui font-body text-neutral-text-secondary">
                  Messages
                </span>
                <span className="text-ui font-body text-marine font-medium">
                  {STUB_USER.messagesUsed} / {STUB_USER.messagesTotal > 0 ? STUB_USER.messagesTotal : "∞"}{" "}
                  <span className="text-neutral-text-tertiary font-normal">
                    {STUB_USER.messagesLabel}
                  </span>
                </span>
              </div>
              <ProgressBar
                value={STUB_USER.messagesUsed}
                max={STUB_USER.messagesTotal || 1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-ui font-body text-neutral-text-secondary">
                  Fichiers ce mois
                </span>
                <span className="text-ui font-body text-marine font-medium">
                  {STUB_USER.filesUsed} / {STUB_USER.filesTotal > 0 ? STUB_USER.filesTotal : "Non inclus"}
                </span>
              </div>
              {STUB_USER.filesTotal > 0 && (
                <ProgressBar
                  value={STUB_USER.filesUsed}
                  max={STUB_USER.filesTotal}
                />
              )}
            </div>
          </div>
        </SectionCard>

        {/* Parrainage */}
        <ReferralSection />

        {/* WhatsApp */}
        <WhatsAppSection isSourcePlus={isSourcePlus} />

        {/* Agents */}
        <AgentsSection
          tier={STUB_USER.planKey}
          isFleuePlus={isFleuePlus}
          isOcean={STUB_USER.planKey === "ocean"}
        />

        {/* Langue */}
        <SectionCard title="Préférences">
          <div>
            <label className="block text-ui font-body font-medium text-marine mb-2">
              Langue de l'interface
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow duration-100"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </SectionCard>

        {/* Déconnexion */}
        <div className="pt-2 pb-8">
          <button
            type="button"
            onClick={async () => {
              await authLogout();
              router.push("/auth/login");
            }}
            className="text-error text-ui font-body font-medium hover:underline transition-colors duration-100"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
