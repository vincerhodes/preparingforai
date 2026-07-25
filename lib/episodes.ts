import { cache } from "react";
import Parser from "rss-parser";
import { site } from "@/site.config";

export interface Episode {
  id: string;
  title: string;
  date: string;
  description: string;
  audioUrl: string;
  link: string;
}

const parser = new Parser();

const DESCRIPTION_MAX_LENGTH = 200;

/** Truncate a description to ~200 chars on a word boundary, with an ellipsis. */
function truncateDescription(text: string): string {
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text;
  const truncated = text.slice(0, DESCRIPTION_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : DESCRIPTION_MAX_LENGTH)}…`;
}

/**
 * Fetch and parse all episodes from the configured RSS feed.
 * Returns an empty list when the feed cannot be fetched, so pages can
 * render a fallback notice. Wrapped in React cache() to dedupe calls
 * within a single render pass.
 */
export const getEpisodes = cache(async (): Promise<Episode[]> => {
  if (!site.rssFeedUrl) return [];

  try {
    const feed = await parser.parseURL(site.rssFeedUrl);
    return (feed.items ?? [])
      .map((item, index) => ({
        id: item.guid ?? item.link ?? `episode-${index}`,
        title: item.title ?? "Untitled episode",
        date: item.isoDate ?? item.pubDate ?? "",
        description: truncateDescription(item.contentSnippet ?? ""),
        audioUrl: item.enclosure?.url ?? "",
        link: item.link ?? site.url,
      }))
      .filter((episode) => episode.title !== "Untitled episode" || episode.audioUrl !== "");
  } catch (error) {
    console.error("Failed to fetch podcast RSS feed:", error);
    return [];
  }
});
