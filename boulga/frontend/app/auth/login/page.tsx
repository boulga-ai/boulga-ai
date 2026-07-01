"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const setUser  = useAuthStore((s) => s.setUser);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `Erreur ${res.status}`);
      }

      const data = await res.json();
      setUser(data.user);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la connexion");
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
            Connectez-vous à votre compte
          </p>
        </div>

        <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
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
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/auth/forgot-password"
              className="text-caption font-body text-blue-700 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <p className="mt-4 text-center text-caption font-body text-neutral-text-secondary">
            Pas encore de compte ?{" "}
            <Link
              href="/auth/register"
              className="text-blue-700 font-medium hover:underline"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
