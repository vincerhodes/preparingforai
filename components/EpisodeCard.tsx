import Link from "next/link";
import type { ReactNode } from "react";
import type { TranscriptSnippetMatch } from "@/lib/types";

export type EpisodeCardEpisode = {
  id?: string;
  slug?: string | null;
  title: string;
  date?: string;
  description?: string;
  season?: number | null;
  format?: string;
  era?: string;
  durationSec?: number;
  summary?: string;
  matchedSnippet?: TranscriptSnippetMatch;
};

type EpisodeCardProps = {
  episode: EpisodeCardEpisode;
  highlightQuery?: string;
};

const FORMAT_LABELS: Record<string, string> = {
  debate: "Debate",
  "deep-dive": "Deep Dive",
  guest: "Guest",
  special: "Special",
};

const FORMAT_STYLES: Record<string, string> = {
  debate: "border-violet-400/60 text-violet-300",
  "deep-dive": "border-emerald-400/60 text-emerald-300",
  guest: "border-amber-400/60 text-amber-300",
  special: "border-rose-400/60 text-rose-300",
};

function formatDate(date: string): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function speakerBadgeClass(speaker: string): string {
  if (speaker === "Jimmy") return "border-accent/60 bg-accent/10 text-accent";
  if (speaker === "Matt") return "border-sky-400/60 bg-sky-400/10 text-sky-400";
  return "border-violet-400/60 bg-violet-400/10 text-violet-300";
}

export default function EpisodeCard({
  episode,
  highlightQuery = "",
}: EpisodeCardProps) {
  const snippet = episode.matchedSnippet;
  const summary = episode.summary ?? episode.description;

  const title = (
    <h3 className="text-lg font-semibold tracking-tight text-foreground">
      {highlightQuery ? highlightText(episode.title, highlightQuery) : episode.title}
    </h3>
  );

  return (
    <article
      className={`rounded-lg border border-border bg-surface p-5 transition-colors ${
        episode.slug ? "hover:border-accent/60" : ""
      }`}
    >
      {episode.slug ? (
        <Link
          href={`/episodes/${episode.slug}`}
          className="transition-colors hover:text-accent"
        >
          {title}
        </Link>
      ) : (
        title
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        {typeof episode.season === "number" && (
          <Badge className="border-sky-400/60 text-sky-400">
            S{episode.season}
          </Badge>
        )}
        {episode.format && FORMAT_LABELS[episode.format] && (
          <Badge className={FORMAT_STYLES[episode.format] ?? "border-border text-muted"}>
            {FORMAT_LABELS[episode.format]}
          </Badge>
        )}
        {episode.era === "peak" && (
          <Badge className="border-pink-400/60 text-pink-400">Peak Era</Badge>
        )}
        {episode.date && (
          <time dateTime={episode.date}>{formatDate(episode.date)}</time>
        )}
        {typeof episode.durationSec === "number" && (
          <span>{Math.round(episode.durationSec / 60)}m</span>
        )}
      </div>

      {summary && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {highlightQuery ? highlightText(summary, highlightQuery) : summary}
        </p>
      )}

      {snippet && (
        <div className="mt-3 rounded-r-md border-l-[3px] border-accent bg-accent/5 px-3 py-2 text-sm">
          <span className="font-mono text-xs font-semibold text-accent">
            [{formatClock(snippet.startTime)}]
          </span>{" "}
          <Badge className={speakerBadgeClass(snippet.speaker)}>
            {snippet.speaker}
          </Badge>{" "}
          <span className="text-muted">
            &ldquo;{highlightText(snippet.snippet, highlightQuery)}&rdquo;
          </span>
        </div>
      )}

      {episode.slug && (
        <Link
          href={`/episodes/${episode.slug}`}
          className="mt-3 inline-block text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Open episode &rarr;
        </Link>
      )}
    </article>
  );
}
