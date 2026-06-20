"use client";

import { useEffect, useRef, useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import hljs from "highlight.js";

interface CodeBlockProps {
  language: string;
  code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");
  const showLineNumbers = lines.length > 5;

  useEffect(() => {
    if (!codeRef.current) return;
    // Réinitialiser pour éviter le double-highlight lors des re-renders streaming
    codeRef.current.removeAttribute("data-highlighted");
    codeRef.current.textContent = code;
    if (language && hljs.getLanguage(language)) {
      hljs.highlightElement(codeRef.current);
    } else {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API non disponible
    }
  };

  return (
    <div className="relative rounded-md overflow-hidden my-3 text-sm">
      {/* Barre supérieure */}
      <div className="flex items-center justify-between px-3 py-2 bg-marine-light border-b border-white/10">
        <span className="text-[11px] text-neutral-text-tertiary font-mono">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-neutral-text-tertiary hover:text-white transition-colors duration-100"
          aria-label="Copier le code"
        >
          {copied ? (
            <>
              <IconCheck size={12} />
              Copié
            </>
          ) : (
            <>
              <IconCopy size={12} />
              Copier
            </>
          )}
        </button>
      </div>

      {/* Contenu */}
      <div className="overflow-x-auto bg-marine" style={{ background: "#0B1F3A" }}>
        {showLineNumbers ? (
          <table className="border-collapse min-w-full">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="leading-6">
                  <td
                    className="select-none text-right pr-4 pl-3 text-[11px] font-mono"
                    style={{ color: "#475569", width: "1%", whiteSpace: "nowrap" }}
                  >
                    {i + 1}
                  </td>
                  <td className="pr-4">
                    <code
                      className="font-mono text-[13px] text-[#e2e8f0]"
                      dangerouslySetInnerHTML={{
                        __html: language && hljs.getLanguage(language)
                          ? hljs.highlight(line, { language }).value
                          : hljs.highlightAuto(line).value,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="p-4 overflow-x-auto">
            <code
              ref={codeRef}
              className={`hljs language-${language || "plaintext"} font-mono text-[13px]`}
            />
          </pre>
        )}
      </div>
    </div>
  );
}
