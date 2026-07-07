"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { Input, Button } from "@/components/ui";

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
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="w-11 h-11 rounded-xl shadow-xs" />
          <h1 className="text-h1 font-display text-marine">Boulga</h1>
          <p className="text-body font-body text-neutral-text-secondary -mt-1">
            Connectez-vous à votre compte
          </p>
        </div>

        <div className="bg-neutral-white border border-neutral-border rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />

            <Input
              type="password"
              label="Mot de passe"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
            />

            {error && (
              <p className="text-caption font-body text-error">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
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
