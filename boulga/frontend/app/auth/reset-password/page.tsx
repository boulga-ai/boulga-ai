"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";
import { API_URL } from "@/lib/constants";
import { Input, Button } from "@/components/ui";

function ResetPasswordContent() {
  const params = useSearchParams();
  const token  = params.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!token) {
      setError("Lien de réinitialisation invalide.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `Erreur ${res.status}`);
      }

      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="" className="w-11 h-11 rounded-xl shadow-xs" />
            <h1 className="text-h1 font-display text-marine">Boulga</h1>
          </div>
          <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
            <p className="text-body font-body text-error mb-4">
              Lien de réinitialisation invalide ou manquant.
            </p>
            <Link
              href="/auth/forgot-password"
              className="text-blue-700 font-medium hover:underline text-ui font-body"
            >
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="w-11 h-11 rounded-xl shadow-xs" />
          <h1 className="text-h1 font-display text-marine">Boulga</h1>
          <p className="text-body font-body text-neutral-text-secondary -mt-1">
            Nouveau mot de passe
          </p>
        </div>

        <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-tint-success rounded-full flex items-center justify-center">
                <IconCheck size={24} className="text-success" />
              </div>
              <p className="text-body font-body text-marine">
                Mot de passe réinitialisé avec succès.
              </p>
              <p className="text-caption font-body text-neutral-text-tertiary">
                Redirection vers la page de connexion…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                label="Nouveau mot de passe"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
              />

              <Input
                type="password"
                label="Confirmer le mot de passe"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Retapez le mot de passe"
              />

              {error && (
                <p className="text-caption font-body text-error">{error}</p>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-caption font-body text-neutral-text-secondary">
            <Link
              href="/auth/login"
              className="text-blue-700 font-medium hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
