"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconSearch,
  IconPencil,
  IconTrash,
  IconCheck,
  IconX,
  IconMessageCircle,
} from "@tabler/icons-react";
import { useChatStore } from "@/store/chatStore";
import { searchConversations, type SearchResult } from "@/lib/api";
import type { Conversation } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} h`;
  if (diffDays === 1) return "Hier";
  return `${diffDays} j`;
}

type Group = "Aujourd'hui" | "Hier" | "7 derniers jours" | "Plus ancien";

function groupConversations(convs: Conversation[]): [Group, Conversation[]][] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000);

  const groups: Record<Group, Conversation[]> = {
    "Aujourd'hui": [],
    "Hier": [],
    "7 derniers jours": [],
    "Plus ancien": [],
  };

  for (const c of convs) {
    const d = new Date(c.updated_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["Aujourd'hui"].push(c);
    else if (day >= yesterday) groups["Hier"].push(c);
    else if (day >= sevenDaysAgo) groups["7 derniers jours"].push(c);
    else groups["Plus ancien"].push(c);
  }

  return (Object.entries(groups) as [Group, Conversation[]][]).filter(
    ([, list]) => list.length > 0,
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onMobileClose?: () => void;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ConversationList({ onMobileClose }: Props) {
  const router = useRouter();

  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const newConversation = useChatStore((s) => s.newConversation);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Debounce 500ms → appel backend si ≥ 2 caractères
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (search.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchConversations(search.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleSelect = useCallback(
    (id: string) => {
      loadConversation(id);
      router.push(`/chat/${id}`);
      onMobileClose?.();
    },
    [loadConversation, router, onMobileClose],
  );

  const handleNew = () => {
    newConversation();
    router.push("/chat");
    onMobileClose?.();
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    setConfirmDeleteId(null);
  };

  const handleRenameStart = (conv: Conversation) => {
    setRenameId(conv.id);
    setRenameValue(conv.title ?? "");
  };

  const handleRenameCommit = () => {
    setRenameId(null);
  };

  // Liste normale filtrée localement (quand recherche < 2 car)
  const filtered = conversations.filter((c) =>
    (c.title ?? "Nouvelle conversation")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const grouped = groupConversations(filtered);

  const isSearching = search.trim().length >= 2;

  return (
    <div className="flex flex-col h-full">
      {/* Bouton nouvelle conversation */}
      <div className="p-3 flex-shrink-0">
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue-700 text-white text-uism font-body font-medium hover:bg-blue-900 transition-colors duration-200"
        >
          <IconPlus size={16} />
          Nouvelle conversation
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="px-3 pb-3 flex-shrink-0">
        <div className="relative">
          <IconSearch
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-7 py-1.5 text-ui font-body rounded-sm border border-neutral-border bg-neutral-bg text-marine placeholder:text-neutral-text-tertiary outline-none focus:border-blue-700 transition-colors duration-100"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setSearchResults(null); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-text-tertiary hover:text-marine"
              aria-label="Effacer la recherche"
            >
              <IconX size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Résultats de recherche backend */}
      {isSearching ? (
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {searchLoading && (
            <p className="text-caption font-body text-neutral-text-tertiary px-2 py-3">
              Recherche…
            </p>
          )}

          {!searchLoading && searchResults !== null && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <IconMessageCircle size={28} className="text-neutral-text-tertiary" />
              <p className="text-caption font-body text-neutral-text-tertiary px-4">
                Aucun résultat pour «&nbsp;{search}&nbsp;»
              </p>
            </div>
          )}

          {!searchLoading && searchResults && searchResults.length > 0 && (
            <>
              <p className="px-2 mb-2 text-caption font-body font-medium text-neutral-text-tertiary uppercase tracking-wide">
                {searchResults.length} résultat{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.map((result) => (
                <button
                  key={result.conversation_id}
                  onClick={() => handleSelect(result.conversation_id)}
                  className={`w-full text-left px-2 py-2.5 rounded-md mb-1 transition-colors duration-100 ${
                    result.conversation_id === currentConversationId
                      ? "bg-blue-50"
                      : "hover:bg-neutral-bg"
                  }`}
                >
                  <p className="text-ui font-body font-medium text-marine truncate">
                    {result.conversation_title ?? "Conversation sans titre"}
                  </p>
                  <p className="text-[11px] font-body text-neutral-text-secondary mt-0.5 line-clamp-2 leading-relaxed">
                    {result.excerpt}
                  </p>
                  <p className="text-[10px] font-body text-neutral-text-tertiary mt-1">
                    {relativeDate(result.updated_at)}
                  </p>
                </button>
              ))}
            </>
          )}
        </div>
      ) : (
        /* Liste normale des conversations */
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <IconMessageCircle size={28} className="text-neutral-text-tertiary" />
              <p className="text-caption font-body text-neutral-text-tertiary px-4">
                Démarrez votre première conversation
              </p>
            </div>
          )}

          {grouped.map(([label, convs]) => (
            <div key={label} className="mb-4">
              <p className="px-2 mb-1 text-caption font-body font-medium text-neutral-text-tertiary uppercase tracking-wide">
                {label}
              </p>

              {convs.map((conv) => {
                const isActive = conv.id === currentConversationId;
                const isConfirmingDelete = confirmDeleteId === conv.id;
                const isRenaming = renameId === conv.id;
                const title = conv.title ?? "Nouvelle conversation";

                return (
                  <div key={conv.id} className="relative group">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 px-2 py-2 rounded-md bg-red-50">
                        <span className="flex-1 text-ui font-body text-error truncate">Supprimer ?</span>
                        <button
                          onClick={() => handleDelete(conv.id)}
                          className="p-1 rounded text-error hover:bg-red-100 transition-colors duration-100"
                          aria-label="Confirmer"
                        >
                          <IconCheck size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 rounded text-neutral-text-tertiary hover:bg-neutral-bg transition-colors duration-100"
                          aria-label="Annuler"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    ) : isRenaming ? (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCommit();
                            if (e.key === "Escape") setRenameId(null);
                          }}
                          onBlur={handleRenameCommit}
                          className="flex-1 text-ui font-body text-marine rounded-sm border border-blue-700 px-2 py-1 outline-none bg-white"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelect(conv.id)}
                        className={`w-full flex items-start justify-between gap-1 px-2 py-2 rounded-md text-left transition-colors duration-100 ${
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-neutral-text-secondary hover:bg-neutral-bg"
                        }`}
                      >
                        <span className="flex-1 text-ui font-body truncate leading-snug">
                          {title}
                        </span>
                        <span className="text-[10px] font-body text-neutral-text-tertiary flex-shrink-0 mt-0.5">
                          {relativeDate(conv.updated_at)}
                        </span>
                      </button>
                    )}

                    {!isRenaming && !isConfirmingDelete && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRenameStart(conv); }}
                          className="p-1 rounded text-neutral-text-tertiary hover:text-marine hover:bg-neutral-bg transition-colors duration-100"
                          aria-label="Renommer"
                        >
                          <IconPencil size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(conv.id); }}
                          className="p-1 rounded text-neutral-text-tertiary hover:text-error hover:bg-red-50 transition-colors duration-100"
                          aria-label="Supprimer"
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
