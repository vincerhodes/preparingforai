import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import TranscriptViewer from "@/components/TranscriptViewer";
import {
  formatTimestamp,
  getCatalog,
  getEpisodeBySlug,
  getPredictionsByEpisode,
} from "@/lib/catalog";
import type { Prediction } from "@/lib/types";

export const revalidate = 3600;

type PageParams = { slug: string };

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

const STATUS_STYLES: Record<Prediction["status"], string> = {
  correct: "border-emerald-400/60 text-emerald-300",
  incorrect: "border-rose-400/60 text-rose-300",
  partial: "border-amber-400/60 text-amber-300",
  pending: "border-sky-400/60 text-sky-300",
  unresolved: "border-border text-muted",
};

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

function hostBadgeClass(host: string): string {
  if (host === "Jimmy") return "border-accent/60 bg-accent/10 text-accent";
  if (host === "Matt") return "border-sky-400/60 bg-sky-400/10 text-sky-400";
  return "border-violet-400/60 bg-violet-400/10 text-violet-300";
}

export function generateStaticParams(): PageParams[] {
  return getCatalog().map((episode) => ({ slug: episode.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) return { title: "Episode not found" };
  return {
    title: episode.title,
    description: episode.summary || episode.description,
  };
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) notFound();

  const predictions = getPredictionsByEpisode(slug);

  return (
    <div>
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link
          href="/episodes"
          className="text-accent transition-colors hover:text-accent-hover"
        >
          &larr; Episodes
        </Link>
        {typeof episode.season === "number" && (
          <span> / S{episode.season}</span>
        )}{" "}
        / <span className="text-foreground">{episode.title}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {episode.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        {typeof episode.season === "number" && (
          <Badge className="border-sky-400/60 text-sky-400">
            S{episode.season}
          </Badge>
        )}
        {FORMAT_LABELS[episode.format] && (
          <Badge className={FORMAT_STYLES[episode.format]}>
            {FORMAT_LABELS[episode.format]}
          </Badge>
        )}
        {episode.era === "peak" && (
          <Badge className="border-pink-400/60 text-pink-400">Peak Era</Badge>
        )}
        {episode.date && (
          <time dateTime={episode.date}>{formatDate(episode.date)}</time>
        )}
        <span>{formatTimestamp(episode.durationSec)}</span>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-surface p-4">
        <audio controls src={episode.audioUrl} className="w-full" />
        {episode.buzzsproutUrl && (
          <a
            href={episode.buzzsproutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-accent transition-colors hover:text-accent-hover"
          >
            Open in Buzzsprout &rarr;
          </a>
        )}
      </div>

      <h2 className="mt-8 flex items-center gap-2 text-lg font-bold text-foreground before:h-4 before:w-[3px] before:rounded-sm before:bg-accent">
        Summary &amp; Key Talking Points
      </h2>
      <div className="mt-3 rounded-lg border border-border bg-surface p-5">
        <p className="text-sm leading-relaxed text-foreground">
          {episode.summary || episode.description}
        </p>
        {episode.keyTalkingPoints.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
            {episode.keyTalkingPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
        {(episode.hostStances.jimmy.length > 0 ||
          episode.hostStances.matt.length > 0) && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-accent">
              Host Stances — Jimmy vs. Matt
            </summary>
            <div className="mt-2 space-y-2">
              {episode.hostStances.jimmy.length > 0 && (
                <div className="border-l-[3px] border-accent pl-3 text-sm text-muted">
                  <b className="text-accent">Jimmy:</b>{" "}
                  {episode.hostStances.jimmy.join(" ")}
                </div>
              )}
              {episode.hostStances.matt.length > 0 && (
                <div className="border-l-[3px] border-sky-400 pl-3 text-sm text-muted">
                  <b className="text-sky-400">Matt:</b>{" "}
                  {episode.hostStances.matt.join(" ")}
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      {predictions.length > 0 && (
        <>
          <h2 className="mt-8 flex items-center gap-2 text-lg font-bold text-foreground before:h-4 before:w-[3px] before:rounded-sm before:bg-accent">
            Predictions Made in This Episode
          </h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <ul className="divide-y divide-border/60">
              {predictions.map((prediction) => (
                <li
                  key={prediction.id}
                  className="flex flex-wrap items-center gap-2 py-2"
                >
                  <span className="min-w-[200px] flex-1 text-sm text-foreground">
                    {prediction.claim}
                  </span>
                  <Badge className={hostBadgeClass(prediction.host)}>
                    {prediction.host}
                  </Badge>
                  <Badge className={STATUS_STYLES[prediction.status]}>
                    {prediction.status}
                  </Badge>
                  <Link
                    href={`/predictions#pred-${prediction.id}`}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    Track on board &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <h2 className="mt-8 flex items-center gap-2 text-lg font-bold text-foreground before:h-4 before:w-[3px] before:rounded-sm before:bg-accent">
        Chapters &amp; Transcript
      </h2>
      <div className="mt-3">
        <TranscriptViewer
          chapters={episode.chapters}
          turns={episode.turns}
          speakers={episode.speakers}
        />
      </div>
    </div>
  );
}
