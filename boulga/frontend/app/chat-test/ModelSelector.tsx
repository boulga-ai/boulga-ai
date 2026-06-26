"use client";

import { useEffect, useState } from "react";

interface ModelOption {
    id: string;
    label: string;
}

const FALLBACK: ModelOption[] = [
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
];

export function ModelSelector({
    value,
    onChange,
    apiBase,
}: {
    value: string;
    onChange: (v: string) => void;
    apiBase: string;
}) {
    const [models, setModels] = useState<ModelOption[]>(FALLBACK);

    useEffect(() => {
        fetch(`${apiBase}/api/chat-test/models`)
            .then((r) => r.json())
            .then((d) => {
                if (Array.isArray(d.models) && d.models.length) setModels(d.models);
            })
            .catch(() => { });
    }, [apiBase]);

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 13,
                background: "white",
                cursor: "pointer",
            }}
        >
            {models.map((m) => (
                <option key={m.id} value={m.id}>
                    {m.label}
                </option>
            ))}
        </select>
    );
}