"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Chapter, TranscriptTurn } from "@/lib/types";

type TranscriptViewerProps = {
  chapters: Chapter[];
  turns: TranscriptTurn[];
  speakers: string[];
};

function formatClock(sec: number): string {
  const totalSeconds = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): ReactNode {
  const terms = (query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((term) => term.length > 0)
    .sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    terms.includes(part.toLowerCase()) ? (
      <mark
        key={index}
        className="rounded-sm bg-accent px-0.5 text-background"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function speakerBadgeClass(speaker: string): string {
  if (speaker === "Jimmy") return "border-accent/60 bg-accent/10 text-accent";
  if (speaker === "Matt") return "border-sky-400/60 bg-sky-400/10 text-sky-400";
  return "border-violet-400/60 bg-violet-400/10 text-violet-300";
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-accent bg-accent font-semibold text-background"
          : "border-border bg-surface text-muted hover:border-accent hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function TranscriptViewer({
  chapters,
  turns,
  speakers,
}: TranscriptViewerProps) {
  const [activeChapter, setActiveChapter] = useState<number | "all">("all");
  const [speaker, setSpeaker] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guestSpeakers = speakers.filter(
    (name) => name !== "Jimmy" && name !== "Matt",
  );
  const speakerOptions = ["All", "Jimmy", "Matt", ...guestSpeakers];

  useEffect(() => {
    const readHash = () => {
      const match = /^#t=(\d+)$/.exec(window.location.hash);
      if (match) {
        setActiveChapter("all");
        setSpeaker("All");
        setQuery("");
        setJumpTarget(Number(match[1]));
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const chapterFiltered = useMemo(
    () =>
      activeChapter === "all"
        ? turns
        : turns.filter((turn) => turn.chapterIndex === activeChapter),
    [turns, activeChapter],
  );

  const speakerFiltered = useMemo(
    () =>
      speaker === "All"
        ? chapterFiltered
        : chapterFiltered.filter((turn) => turn.speaker === speaker),
    [chapterFiltered, speaker],
  );

  const queryTokens = useMemo(
    () =>
      (query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
        (term) => term.length > 0,
      ),
    [query],
  );

  const matchingTurns = useMemo(
    () =>
      queryTokens.length
        ? speakerFiltered.filter((turn) => {
            const lowerText = turn.text.toLowerCase();
            return queryTokens.every((token) => lowerText.includes(token));
          })
        : speakerFiltered,
    [speakerFiltered, queryTokens],
  );

  useEffect(() => {
    if (jumpTarget === null) return;
    const target =
      [...turns].filter((turn) => turn.startTime <= jumpTarget).pop() ??
      turns[0];
    if (!target) return;
    const id = `t-${Math.floor(target.startTime)}`;
    const frame = requestAnimationFrame(() => {
      setJumpTarget(null);
      const element = document.getElementById(id);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashId(id);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashId(null), 1800);
    });
    return () => cancelAnimationFrame(frame);
  }, [jumpTarget, turns]);

  const jumpToChapter = (index: number) => {
    setActiveChapter(index);
    const first = turns.find((turn) => turn.chapterIndex === index);
    if (!first) return;
    const id = `t-${Math.floor(first.startTime)}`;
    setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          label="All chapters"
          active={activeChapter === "all"}
          onClick={() => setActiveChapter("all")}
        />
        {chapters.map((chapter, index) => (
          <Chip
            key={`${chapter.title}-${index}`}
            label={`${chapter.title} · ${formatClock(chapter.startTime)}`}
            active={activeChapter === index}
            onClick={() => jumpToChapter(index)}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Speaker</span>
        {speakerOptions.map((name) => (
          <Chip
            key={name}
            label={name}
            active={speaker === name}
            onClick={() => setSpeaker(name)}
          />
        ))}
      </div>

      <div className="relative mt-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this transcript…"
          aria-label="Search this transcript"
          className="w-full rounded-lg border border-border bg-background px-4 py-2 pr-20 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {queryTokens.length > 0 && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            {matchingTurns.length} match{matchingTurns.length === 1 ? "" : "es"}
          </span>
        )}
      </div>

      <div className="mt-4">
        {matchingTurns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <p className="text-lg font-semibold text-foreground">
              {queryTokens.length
                ? "0 transcript matches"
                : "No turns in this view"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {queryTokens.length
                ? `No speaker turn contains “${query}”.`
                : "Pick another chapter or speaker filter."}
            </p>
          </div>
        ) : (
          matchingTurns.map((turn) => {
            const id = `t-${Math.floor(turn.startTime)}`;
            return (
              <div
                key={id}
                id={id}
                className={`flex scroll-mt-24 gap-3 border-b border-border/50 px-1 py-2 transition-colors duration-1000 ${
                  flashId === id ? "bg-accent/15" : "bg-transparent"
                }`}
              >
                <a
                  href={`#t=${Math.floor(turn.startTime)}`}
                  className="min-w-[3rem] shrink-0 pt-1 font-mono text-xs text-muted transition-colors hover:text-accent"
                >
                  {formatClock(turn.startTime)}
                </a>
                <div className="flex-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${speakerBadgeClass(turn.speaker)}`}
                  >
                    {turn.speaker}
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {queryTokens.length
                      ? highlightText(turn.text, query)
                      : turn.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
