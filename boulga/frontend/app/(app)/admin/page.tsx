"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { API_URL } from "@/lib/constants";
import type { Tier } from "@/types";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  tier: Tier;
}

const TIERS: Tier[] = ["free", "goutte", "source", "fleuve", "ocean"];

const TIER_LABELS: Record<Tier, string> = {
  free: "Gratuit",
  goutte: "Goutte",
  source: "Source",
  fleuve: "Fleuve",
  ocean: "Océan",
};

const TIER_BADGE_CLASS: Record<Tier, string> = {
  free: "bg-gray-100 text-gray-600",
  goutte: "bg-blue-50 text-blue-700",
  source: "bg-blue-700 text-white",
  fleuve: "bg-[#0B1F3A] text-white",
  ocean: "bg-purple-700 text-white",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) return;
    if (!user.is_admin) {
      router.replace("/chat");
    }
  }, [user, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = useAuthStore.getState().getToken();
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const changeTier = async (userId: string, tier: Tier) => {
    setUpdating(userId);
    try {
      const token = useAuthStore.getState().getToken();
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setUpdating(null);
    }
  };

  if (!user?.is_admin) return null;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[26px] font-display font-normal text-[#0B1F3A]">
            Administration
          </h1>
          <p className="mt-1 text-[15px] font-body text-[#4A5568]">
            Gestion des utilisateurs et de leurs abonnements
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[14px] font-body text-[#C62828]">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E0E4EC] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[14px] font-body text-[#94A3B8]">
              Chargement…
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-[14px] font-body text-[#94A3B8]">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] font-body">
                <thead>
                  <tr className="border-b border-[#E0E4EC] bg-[#F5F7FA]">
                    <th className="text-left px-5 py-3 font-medium text-[#0B1F3A]">Nom</th>
                    <th className="text-left px-5 py-3 font-medium text-[#0B1F3A]">Email</th>
                    <th className="text-left px-5 py-3 font-medium text-[#0B1F3A]">Plan actuel</th>
                    <th className="text-left px-5 py-3 font-medium text-[#0B1F3A]">Membre depuis</th>
                    <th className="text-left px-5 py-3 font-medium text-[#0B1F3A]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-[#E0E4EC] last:border-0 ${
                        i % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]/50"
                      }`}
                    >
                      <td className="px-5 py-4 text-[#0B1F3A]">
                        <span className="font-medium">{u.name}</span>
                        {u.is_admin && (
                          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                            admin
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[#4A5568]">{u.email}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block text-[12px] font-medium px-2.5 py-1 rounded-full ${TIER_BADGE_CLASS[u.tier]}`}
                        >
                          {TIER_LABELS[u.tier]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#94A3B8]">
                        {u.created_at ? formatDate(u.created_at) : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {updating === u.id ? (
                          <span className="text-[13px] text-[#94A3B8]">Mise à jour…</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {TIERS.map((tier) => (
                              <button
                                key={tier}
                                onClick={() => changeTier(u.id, tier)}
                                disabled={u.tier === tier}
                                className={`text-[12px] px-2.5 py-1 rounded-lg border transition-colors duration-200 ${
                                  u.tier === tier
                                    ? "bg-[#1565C0] text-white border-[#1565C0] cursor-default"
                                    : "bg-white text-[#4A5568] border-[#E0E4EC] hover:border-[#1565C0] hover:text-[#1565C0]"
                                }`}
                              >
                                {TIER_LABELS[tier]}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-[12px] font-body text-[#94A3B8]">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
