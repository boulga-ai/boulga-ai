export interface FileReady {
    fileId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    summary?: string;
    format?: string;
    url: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    file?: FileReady;
}