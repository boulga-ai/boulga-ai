"use client";

import { useState } from "react";
import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";
import { API_URL } from "@/lib/constants";
import { Input, Button } from "@/components/ui";

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
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="w-11 h-11 rounded-xl shadow-xs" />
          <h1 className="text-h1 font-display text-marine">Boulga</h1>
          <p className="text-body font-body text-neutral-text-secondary -mt-1">
            Réinitialiser votre mot de passe
          </p>
        </div>

        <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-tint-success rounded-full flex items-center justify-center">
                <IconCheck size={24} className="text-success" />
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
              <Input
                type="email"
                label="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />

              {error && (
                <p className="text-caption font-body text-error">{error}</p>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? "Envoi en cours…" : "Envoyer le lien"}
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
