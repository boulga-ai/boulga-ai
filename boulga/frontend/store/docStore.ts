import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentState {
  content: string;
  format: string; // "markdown" | "code" | "file"
  versions: string[]; // versions précédentes (index 0 = la plus ancienne)
}

export interface FileReady {
  url: string;
  name: string;
  format: string; // extension : "docx", "xlsx", "pdf"…
  size: number;
}

// ── State / Actions ───────────────────────────────────────────────────────────

interface DocStoreState {
  currentDocument: DocumentState | null;
  fileReady: FileReady | null;
  /** Index de version affiché (null = version courante) */
  viewingVersionIndex: number | null;
}

interface DocStoreActions {
  openDocument: (content: string, format?: string) => void;
  updateDocument: (content: string) => void;
  setFileReady: (info: FileReady) => void;
  clearFileReady: () => void;
  closeDocument: () => void;
  goToVersion: (index: number) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDocStore = create<DocStoreState & DocStoreActions>((set, get) => ({
  currentDocument: null,
  fileReady: null,
  viewingVersionIndex: null,

  openDocument: (content: string, format = "markdown") => {
    set({
      currentDocument: { content, format, versions: [] },
      viewingVersionIndex: null,
    });
  },

  updateDocument: (content: string) => {
    const { currentDocument } = get();
    if (!currentDocument) {
      // Pas encore de document → ouvrir
      set({ currentDocument: { content, format: "markdown", versions: [] }, viewingVersionIndex: null });
      return;
    }
    // Ajouter la version courante aux versions précédentes
    set({
      currentDocument: {
        ...currentDocument,
        content,
        versions: [...currentDocument.versions, currentDocument.content],
      },
      viewingVersionIndex: null,
    });
  },

  setFileReady: (info: FileReady) => {
    set({ fileReady: info });
    // Si pas de document texte ouvert, créer un document "file" minimaliste
    const { currentDocument } = get();
    if (!currentDocument) {
      set({
        currentDocument: {
          content: `Fichier **${info.name}** prêt au téléchargement.`,
          format: "file",
          versions: [],
        },
        viewingVersionIndex: null,
      });
    }
  },

  clearFileReady: () => {
    set({ fileReady: null });
    // Si le document courant était un document "file" minimaliste, le fermer aussi
    const { currentDocument } = get();
    if (currentDocument?.format === "file") {
      set({ currentDocument: null, viewingVersionIndex: null });
    }
  },

  closeDocument: () => {
    set({ currentDocument: null, fileReady: null, viewingVersionIndex: null });
  },

  goToVersion: (index: number) => {
    const { currentDocument } = get();
    if (!currentDocument) return;
    if (index < 0 || index > currentDocument.versions.length) return;
    // index = versions.length → version courante
    set({ viewingVersionIndex: index < currentDocument.versions.length ? index : null });
  },
}));
