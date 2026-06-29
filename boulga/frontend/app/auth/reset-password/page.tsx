"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";

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
          <h1 className="text-display font-display text-marine mb-4">Boulga</h1>
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
        <div className="text-center mb-8">
          <h1 className="text-display font-display text-marine">Boulga</h1>
          <p className="text-body font-body text-neutral-text-secondary mt-1">
            Nouveau mot de passe
          </p>
        </div>

        <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
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
              <div>
                <label className="block text-ui font-body font-medium text-marine mb-1">
                  Nouveau mot de passe
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

              <div>
                <label className="block text-ui font-body font-medium text-marine mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Retapez le mot de passe"
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
                {loading ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
              </button>
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
