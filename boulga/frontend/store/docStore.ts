import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentState {
  content: string;
  format: string; // "markdown" | "code" | "file"
  versions: string[]; // versions précédentes (index 0 = la plus ancienne)
}

/** Un artifact = fichier généré par le LLM, lié à un message */
export interface Artifact {
  id: string;          // file_id backend
  messageId?: string;  // message auquel il est lié (optionnel)
  name: string;
  url: string;         // URL signée Supabase
  mimeType: string;
  size: number;
  createdAt: number;   // Date.now()
}

// ── State / Actions ───────────────────────────────────────────────────────────

interface DocStoreState {
  currentDocument: DocumentState | null;
  viewingVersionIndex: number | null;
  /** Liste de tous les artifacts générés dans la session */
  artifacts: Artifact[];
  /** Index de l'artifact affiché dans le panel (null = panel sur document texte) */
  currentArtifactIndex: number | null;
  /** Panel ouvert */
  panelOpen: boolean;
}

interface DocStoreActions {
  openDocument: (content: string, format?: string) => void;
  updateDocument: (content: string) => void;
  closeDocument: () => void;
  goToVersion: (index: number) => void;
  /** Ajoute un artifact et l'ouvre dans le panel */
  addArtifact: (artifact: Artifact) => void;
  /** Navigue vers un artifact par index */
  goToArtifact: (index: number) => void;
  /** Ferme le panel */
  closePanel: () => void;
  /** Ouvre le panel sur l'artifact courant ou le document */
  openPanel: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDocStore = create<DocStoreState & DocStoreActions>((set, get) => ({
  currentDocument: null,
  viewingVersionIndex: null,
  artifacts: [],
  currentArtifactIndex: null,
  panelOpen: false,

  openDocument: (content: string, format = "markdown") => {
    set({
      currentDocument: { content, format, versions: [] },
      viewingVersionIndex: null,
      currentArtifactIndex: null,
      panelOpen: true,
    });
  },

  updateDocument: (content: string) => {
    const { currentDocument } = get();
    if (!currentDocument) {
      set({
        currentDocument: { content, format: "markdown", versions: [] },
        viewingVersionIndex: null,
        panelOpen: true,
      });
      return;
    }
    set({
      currentDocument: {
        ...currentDocument,
        content,
        versions: [...currentDocument.versions, currentDocument.content],
      },
      viewingVersionIndex: null,
    });
  },

  closeDocument: () => {
    set({
      currentDocument: null,
      viewingVersionIndex: null,
      currentArtifactIndex: null,
      panelOpen: false,
    });
  },

  goToVersion: (index: number) => {
    const { currentDocument } = get();
    if (!currentDocument) return;
    if (index < 0 || index > currentDocument.versions.length) return;
    set({ viewingVersionIndex: index < currentDocument.versions.length ? index : null });
  },

  addArtifact: (artifact: Artifact) => {
    const { artifacts } = get();
    const newArtifacts = [...artifacts, artifact];
    set({
      artifacts: newArtifacts,
      currentArtifactIndex: newArtifacts.length - 1,
      currentDocument: null,
      panelOpen: true,
    });
  },

  goToArtifact: (index: number) => {
    const { artifacts } = get();
    if (index < 0 || index >= artifacts.length) return;
    set({ currentArtifactIndex: index, currentDocument: null });
  },

  closePanel: () => {
    set({ panelOpen: false });
  },

  openPanel: () => {
    set({ panelOpen: true });
  },
}));
