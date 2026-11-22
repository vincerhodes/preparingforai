import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  EpisodeDetail,
  EpisodeEra,
  EpisodeFormat,
  EpisodeMeta,
  HostProfile,
  Prediction,
  TranscriptSnippetMatch,
  TranscriptTurn,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DEFAULT_SEARCH_LIMIT = 20;
const SNIPPET_TEXT_LENGTH = 180;

let catalogCache: EpisodeMeta[] | null = null;
let predictionsCache: Prediction[] | null = null;
let hostProfilesCache: Record<string, HostProfile> | null = null;
let searchCache: EpisodeDetail[] | null = null;
const episodeCache = new Map<string, EpisodeDetail | null>();

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function withoutDetail(episode: EpisodeDetail): EpisodeMeta {
  const { chapters: _chapters, turns: _turns, ...meta } = episode;
  return meta;
}

function byNewest(a: EpisodeMeta, b: EpisodeMeta): number {
  return b.date.localeCompare(a.date);
}

export function getCatalog(): EpisodeMeta[] {
  if (catalogCache) return catalogCache;

  const catalog = readJson<EpisodeMeta[] | { episodes: EpisodeMeta[] }>(
    path.join(DATA_DIR, "catalog.json"),
    [],
  );
  const rawIndex = readJson<EpisodeMeta[] | { episodes: EpisodeMeta[] }>(
    path.join(DATA_DIR, "raw-index.json"),
    [],
  );
  const episodes = Array.isArray(catalog)
    ? catalog
    : Array.isArray(catalog.episodes)
      ? catalog.episodes
      : Array.isArray(rawIndex)
        ? rawIndex
        : rawIndex.episodes;

  catalogCache = [...episodes].sort(byNewest);
  return catalogCache;
}

export function getEpisodeBySlug(slug: string): EpisodeDetail | null {
  if (episodeCache.has(slug)) return episodeCache.get(slug) ?? null;
  if (!/^[\w-]+$/.test(slug)) return null;

  const episode = readJson<EpisodeDetail | null>(
    path.join(DATA_DIR, "episodes", `${slug}.json`),
    null,
  );
  episodeCache.set(slug, episode);
  return episode;
}

export function getEpisodeByIdOrSlug(idOrSlug: string): EpisodeDetail | null {
  const direct = getEpisodeBySlug(idOrSlug);
  if (direct) return direct;

  const meta = getCatalog().find(
    (episode) =>
      episode.slug === idOrSlug || episode.buzzsproutId === idOrSlug,
  );
  return meta ? getEpisodeBySlug(meta.slug) : null;
}

export function getPredictions(): Prediction[] {
  if (predictionsCache) return predictionsCache;
  const value = readJson<Prediction[] | { predictions: Prediction[] }>(
    path.join(DATA_DIR, "predictions.json"),
    [],
  );
  predictionsCache = Array.isArray(value) ? value : value.predictions;
  return predictionsCache;
}

export function getPredictionsByEpisode(slug: string): Prediction[] {
  return getPredictions().filter((prediction) => prediction.episodeSlug === slug);
}

export function getHostProfiles(): Record<string, HostProfile> {
  if (hostProfilesCache) return hostProfilesCache;
  hostProfilesCache = readJson<Record<string, HostProfile>>(
    path.join(DATA_DIR, "profiles.json"),
    {},
  );
  return hostProfilesCache;
}

function tokens(query: string): string[] {
  return query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function occurrenceCount(haystack: string, token: string): number {
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(token, offset)) !== -1) {
    count += 1;
    offset += token.length;
  }
  return count;
}

function scoreText(text: string, queryTokens: string[]): number {
  return queryTokens.reduce(
    (score, token) => score + occurrenceCount(text, token),
    0,
  );
}

function makeSnippet(turn: TranscriptTurn, queryTokens: string[]): string {
  const lowerText = turn.text.toLocaleLowerCase();
  const matchIndexes = queryTokens
    .map((token) => lowerText.indexOf(token))
    .filter((index) => index >= 0);
  const firstMatch = matchIndexes.length ? Math.min(...matchIndexes) : 0;
  let start = Math.max(0, firstMatch - 60);
  let end = Math.min(turn.text.length, start + SNIPPET_TEXT_LENGTH);
  start = Math.max(0, end - SNIPPET_TEXT_LENGTH);

  if (start > 0) {
    const wordBoundary = turn.text.indexOf(" ", start);
    if (wordBoundary >= 0 && wordBoundary < firstMatch) start = wordBoundary + 1;
  }
  if (end < turn.text.length) {
    const wordBoundary = turn.text.lastIndexOf(" ", end);
    if (wordBoundary > start) end = wordBoundary;
  }

  const excerpt = turn.text.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${end < turn.text.length ? "…" : ""}`;
}

function snippetFor(
  episode: EpisodeMeta,
  turn: TranscriptTurn,
  queryTokens: string[],
  score: number,
): TranscriptSnippetMatch {
  return {
    episodeSlug: episode.slug,
    episodeTitle: episode.title,
    episodeDate: episode.date,
    season: episode.season,
    format: episode.format,
    era: episode.era,
    speaker: turn.speaker,
    startTime: turn.startTime,
    snippet: makeSnippet(turn, queryTokens),
    score,
  };
}

function getSearchEpisodes(): EpisodeDetail[] {
  if (searchCache) return searchCache;
  searchCache = getCatalog()
    .map((episode) => getEpisodeBySlug(episode.slug))
    .filter((episode): episode is EpisodeDetail => episode !== null);
  return searchCache;
}

export function searchCatalog(opts: {
  query: string;
  speaker?: string;
  season?: number;
  format?: EpisodeFormat;
  era?: EpisodeEra;
  limit?: number;
}): {
  episodes: Array<{
    episode: EpisodeMeta;
    matchedSnippet?: TranscriptSnippetMatch;
  }>;
  transcriptMatches: TranscriptSnippetMatch[];
} {
  const queryTokens = tokens(opts.query);
  const speaker = opts.speaker?.toLocaleLowerCase();
  const limit = Math.max(0, opts.limit ?? DEFAULT_SEARCH_LIMIT);
  const episodeResults: Array<{
    episode: EpisodeMeta;
    matchedSnippet?: TranscriptSnippetMatch;
    score: number;
  }> = [];
  const transcriptMatches: TranscriptSnippetMatch[] = [];

  for (const detail of getSearchEpisodes()) {
    if (opts.season !== undefined && detail.season !== opts.season) continue;
    if (opts.format && detail.format !== opts.format) continue;
    if (opts.era && detail.era !== opts.era) continue;

    const title = detail.title.toLocaleLowerCase();
    const summary = detail.summary.toLocaleLowerCase();
    const talkingPoints = detail.keyTalkingPoints.join(" ").toLocaleLowerCase();
    const metadataText = `${title} ${summary} ${talkingPoints}`;
    const metadataMatches = queryTokens.every((token) =>
      metadataText.includes(token),
    );
    const metadataScore = metadataMatches
      ? scoreText(title, queryTokens) * 5 +
        scoreText(summary, queryTokens) * 2 +
        scoreText(talkingPoints, queryTokens) * 3
      : 0;

    let bestSnippet: TranscriptSnippetMatch | undefined;
    for (const turn of detail.turns) {
      if (speaker && turn.speaker.toLocaleLowerCase() !== speaker) continue;
      if (!queryTokens.length) continue;
      const turnText = turn.text.toLocaleLowerCase();
      if (!queryTokens.every((token) => turnText.includes(token))) continue;

      const score = scoreText(turnText, queryTokens);
      const match = snippetFor(detail, turn, queryTokens, score);
      transcriptMatches.push(match);
      if (!bestSnippet || score > bestSnippet.score) bestSnippet = match;
    }

    if (speaker && !bestSnippet) continue;
    if (!queryTokens.length || metadataMatches || bestSnippet) {
      episodeResults.push({
        episode: withoutDetail(detail),
        matchedSnippet: bestSnippet,
        score: metadataScore + (bestSnippet?.score ?? 0),
      });
    }
  }

  episodeResults.sort(
    (a, b) => b.score - a.score || byNewest(a.episode, b.episode),
  );
  transcriptMatches.sort(
    (a, b) =>
      b.score - a.score ||
      b.episodeDate.localeCompare(a.episodeDate) ||
      a.startTime - b.startTime,
  );

  return {
    episodes: episodeResults.slice(0, limit).map(({ score: _score, ...result }) => result),
    transcriptMatches: transcriptMatches.slice(0, limit),
  };
}

export function formatTimestamp(sec: number): string {
  const totalSeconds = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}
