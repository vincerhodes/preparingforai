import type { Episode } from "@/lib/episodes";

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

export default function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-lg font-semibold text-foreground">{episode.title}</h3>
      {episode.date && (
        <p className="mt-1 text-sm text-muted">
          <time dateTime={episode.date}>{formatDate(episode.date)}</time>
        </p>
      )}
      {episode.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {episode.description}
        </p>
      )}
      {episode.audioUrl && (
        <audio controls preload="none" src={episode.audioUrl} className="mt-4 w-full">
          Your browser does not support the audio element.
        </audio>
      )}
    </article>
  );
}
