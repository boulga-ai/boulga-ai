"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `Erreur ${res.status}`);
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-display font-display text-marine">Boulga</h1>
          <p className="text-body font-body text-neutral-text-secondary mt-1">
            Réinitialiser votre mot de passe
          </p>
        </div>

        <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-body font-body text-marine">
                Si un compte existe avec l'adresse <span className="font-medium">{email}</span>,
                vous recevrez un email avec un lien de réinitialisation.
              </p>
              <p className="text-caption font-body text-neutral-text-tertiary">
                Vérifiez aussi vos spams. Le lien expire dans 1 heure.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-caption font-body text-neutral-text-secondary">
                Entrez l'adresse email associée à votre compte.
                Nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
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

              {error && (
                <p className="text-caption font-body text-error">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-lg hover:bg-blue-900 transition-colors duration-100 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "Envoi en cours…" : "Envoyer le lien"}
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
