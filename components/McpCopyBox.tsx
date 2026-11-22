"use client";

import { useEffect, useState } from "react";

type McpCopyBoxProps = {
  label: string;
  value: string;
  language?: string;
  className?: string;
};

export function McpCopyBox({
  label,
  value,
  language = "text",
  className = "",
}: McpCopyBoxProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  async function copyValue() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Copy failed");
      }
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  const buttonLabel =
    copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-slate-950/70 shadow-lg shadow-slate-950/20 ${className}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border/80 bg-surface/50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-wide text-foreground">{label}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted">{language}</p>
        </div>
        <button
          type="button"
          onClick={copyValue}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-slate-900 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-slate-950"
          aria-label={`Copy ${label}`}
        >
          {copyState === "copied" ? (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="m4 10 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
              <rect x="6.5" y="6.5" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13.5 6.5v-2a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
          <span aria-live="polite">{buttonLabel}</span>
        </button>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-4 text-left font-mono text-xs leading-6 text-slate-200 sm:text-sm">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export default McpCopyBox;
