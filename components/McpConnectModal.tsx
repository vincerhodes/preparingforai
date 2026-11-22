"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import McpCopyBox from "@/components/McpCopyBox";

const ENDPOINT = "https://preparingforai.net/api/mcp";
const QUICK_START_PROMPT = `Read https://preparingforai.net/mcp and set up the Preparing for AI MCP server for me. Configure the public remote Streamable HTTP server at ${ENDPOINT} for my AI client. It is read-only and needs no API key. Test it with list_episodes, then help me research and prep the next Preparing for AI episode.`;
const TOOL_NAMES = [
  "search_transcripts",
  "get_episode",
  "list_episodes",
  "search_predictions",
  "get_host_profile",
];

export function McpConnectModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mcp-connect-dialog"
        className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-bold tracking-wider text-accent transition hover:border-accent hover:bg-accent hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
      >
        MCP
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            id="mcp-connect-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mcp-connect-title"
            aria-describedby="mcp-connect-description"
            className="my-auto w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-6 border-b border-border px-5 py-5 sm:px-7">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  Public · Read-only · No API key
                </p>
                <h2 id="mcp-connect-title" className="text-2xl font-bold tracking-tight text-white">
                  Connect AI to the podcast
                </h2>
                <p id="mcp-connect-description" className="mt-2 text-sm leading-6 text-muted">
                  Give Claude, ChatGPT, Cursor, or another MCP client access to every episode,
                  transcript, stance, and prediction.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close MCP connection dialog"
                className="rounded-lg border border-border p-2 text-muted transition hover:border-muted hover:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
              <McpCopyBox label="Public Streamable HTTP endpoint" value={ENDPOINT} language="url" />

              <section aria-labelledby="mcp-modal-tools">
                <h3 id="mcp-modal-tools" className="text-sm font-semibold text-white">
                  Five research tools
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {TOOL_NAMES.map((tool) => (
                    <li
                      key={tool}
                      className="rounded-md border border-border bg-slate-950/60 px-2.5 py-1.5 font-mono text-xs text-slate-300"
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </section>

              <McpCopyBox
                label="Quick-start prompt for any LLM"
                value={QUICK_START_PROMPT}
                language="prompt"
              />
            </div>

            <div className="border-t border-border px-5 py-5 sm:px-7">
              <Link
                href="/mcp"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
              >
                Full Setup Guide for Matt &amp; All AI Clients →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default McpConnectModal;
