"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconCheck, IconGift } from "@tabler/icons-react";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";

export default function RegisterPage() {
  const params       = useSearchParams();
  const refCode      = params.get("ref") ?? "";
  const router       = useRouter();

  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, string> = {
        name,
        email,
        date_of_birth: birthdate,
        password,
      };
      if (refCode) body.referral_code = refCode;

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `Erreur ${res.status}`);
      }

      const data = await res.json();
      login(data.user, data.access_token);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-display font-display text-marine">Boulga</h1>
          <p className="text-body font-body text-neutral-text-secondary mt-1">
            Créez votre compte gratuitement
          </p>
        </div>

        {/* Bannière de parrainage */}
        {refCode && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-700/20 rounded-lg">
            <IconGift size={20} className="flex-shrink-0 text-blue-700 mt-0.5" />
            <div>
              <p className="text-ui font-body font-medium text-marine">
                Invitation acceptée
              </p>
              <p className="text-caption font-body text-neutral-text-secondary mt-0.5">
                Vous avez été parrainé(e). En souscrivant un plan payant, votre
                parrain recevra une récompense automatiquement.
              </p>
            </div>
          </div>
        )}

        <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Nom complet
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aymar Ouédraogo"
                className="w-full h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow duration-100"
              />
            </div>

            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow duration-100"
              />
            </div>

            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                required
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow duration-100"
              />
            </div>

            <div>
              <label className="block text-ui font-body font-medium text-marine mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full h-10 px-3 border border-neutral-border rounded-md text-body font-body text-marine bg-neutral-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-shadow duration-100"
              />
            </div>

            {error && (
              <p className="text-caption font-body text-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-lg hover:bg-blue-900 transition-colors duration-100 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Création du compte…" : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-caption font-body text-neutral-text-secondary">
            Déjà un compte ?{" "}
            <Link
              href="/auth/login"
              className="text-blue-700 font-medium hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>

        {/* Plan gratuit */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <IconCheck size={14} className="text-success" />
          <span className="text-caption font-body text-neutral-text-secondary">
            10 messages offerts par jour — sans carte bancaire
          </span>
        </div>
      </div>
    </div>
  );
}
