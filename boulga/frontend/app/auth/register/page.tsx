"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconCheck, IconGift } from "@tabler/icons-react";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { Input, Button } from "@/components/ui";

function RegisterContent() {
  const params       = useSearchParams();
  const refCode      = params.get("ref") ?? "";
  const router       = useRouter();

  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

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
      setUser(data.user);
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
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="w-11 h-11 rounded-xl shadow-xs" />
          <h1 className="text-h1 font-display text-marine">Boulga</h1>
          <p className="text-body font-body text-neutral-text-secondary -mt-1">
            Créez votre compte gratuitement
          </p>
        </div>

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
            <Input
              type="text"
              label="Nom complet"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aymar Ouédraogo"
            />

            <Input
              type="email"
              label="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />

            <Input
              type="date"
              label="Date de naissance"
              required
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
            />

            <Input
              type="password"
              label="Mot de passe"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
            />

            {error && (
              <p className="text-caption font-body text-error">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "Création du compte…" : "Créer mon compte"}
            </Button>
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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
