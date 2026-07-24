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

/**
 * Fetch and parse all episodes from the configured RSS feed.
 * Returns an empty list when rssFeedUrl is not configured yet or the
 * feed cannot be fetched, so pages can render a placeholder notice.
 */
export async function getEpisodes(): Promise<Episode[]> {
  if (!site.rssFeedUrl) return [];

  try {
    const feed = await parser.parseURL(site.rssFeedUrl);
    return (feed.items ?? [])
      .map((item, index) => ({
        id: item.guid ?? item.link ?? `episode-${index}`,
        title: item.title ?? "Untitled episode",
        date: item.isoDate ?? item.pubDate ?? "",
        description: item.contentSnippet ?? "",
        audioUrl: item.enclosure?.url ?? "",
        link: item.link ?? site.url,
      }))
      .filter((episode) => episode.title !== "Untitled episode" || episode.audioUrl !== "");
  } catch (error) {
    console.error("Failed to fetch podcast RSS feed:", error);
    return [];
  }
}
