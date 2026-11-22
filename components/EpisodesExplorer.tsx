"use client";

import { useEffect, useMemo, useState } from "react";
import EpisodeCard from "@/components/EpisodeCard";
import type { EpisodeMeta, TranscriptSnippetMatch } from "@/lib/types";

type SeasonFilter = "All" | "S4" | "S3" | "S2" | "S1";
type FormatFilter = "All" | "Debate" | "Deep Dive" | "Guest" | "Special";
type EraFilter = "All" | "Peak Era";

const SEASONS: readonly SeasonFilter[] = ["All", "S4", "S3", "S2", "S1"];
const FORMATS: readonly FormatFilter[] = [
  "All",
  "Debate",
  "Deep Dive",
  "Guest",
  "Special",
];
const ERAS: readonly EraFilter[] = ["All", "Peak Era"];

const FORMAT_VALUES: Record<string, EpisodeMeta["format"]> = {
  Debate: "debate",
  "Deep Dive": "deep-dive",
  Guest: "guest",
  Special: "special",
};

type DisplayEpisode = EpisodeMeta & { matchedSnippet?: TranscriptSnippetMatch };

type SearchResponse = {
  key: string;
  episodes: DisplayEpisode[];
  transcriptMatchCount: number;
};

type SearchApiResult = {
  episodes?: DisplayEpisode[];
  transcriptMatches?: unknown[];
};

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

export default function EpisodesExplorer({
  initialEpisodes,
}: {
  initialEpisodes: EpisodeMeta[];
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [season, setSeason] = useState<SeasonFilter>("All");
  const [format, setFormat] = useState<FormatFilter>("All");
  const [era, setEra] = useState<EraFilter>("All");
  const [response, setResponse] = useState<SearchResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const searchKey = useMemo(() => {
    if (!debouncedQuery) return "";
    const params = new URLSearchParams({ q: debouncedQuery });
    if (season !== "All") params.set("season", season.slice(1));
    if (format !== "All") params.set("format", FORMAT_VALUES[format]);
    if (era === "Peak Era") params.set("era", "peak");
    return params.toString();
  }, [debouncedQuery, season, format, era]);

  useEffect(() => {
    if (!searchKey) return;
    const controller = new AbortController();
    fetch(`/api/search?${searchKey}`, { signal: controller.signal })
      .then((result) => (result.ok ? result.json() : null))
      .then((data: SearchApiResult | null) => {
        if (!data) return;
        setResponse({
          key: searchKey,
          episodes: data.episodes ?? [],
          transcriptMatchCount: data.transcriptMatches?.length ?? 0,
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [searchKey]);

  const searching = searchKey !== "" && response?.key !== searchKey;

  const episodes: DisplayEpisode[] = useMemo(() => {
    if (searchKey) return response?.episodes ?? [];
    return initialEpisodes.filter((episode) => {
      if (season !== "All" && episode.season !== Number(season.slice(1)))
        return false;
      if (format !== "All" && episode.format !== FORMAT_VALUES[format])
        return false;
      if (era === "Peak Era" && episode.era !== "peak") return false;
      return true;
    });
  }, [searchKey, response, initialEpisodes, season, format, era]);

  const transcriptMatchCount =
    searchKey !== "" && response?.key === searchKey
      ? response.transcriptMatchCount
      : 0;

  const clearFilters = () => {
    setQuery("");
    setSeason("All");
    setFormat("All");
    setEra("All");
  };

  return (
    <div>
      <div className="relative mt-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search episodes & transcripts…"
          aria-label="Search episodes and transcripts"
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Season</span>
        {SEASONS.map((value) => (
          <Chip
            key={value}
            label={value}
            active={season === value}
            onClick={() => setSeason(value)}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Format</span>
        {FORMATS.map((value) => (
          <Chip
            key={value}
            label={value}
            active={format === value}
            onClick={() => setFormat(value)}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Era</span>
        {ERAS.map((value) => (
          <Chip
            key={value}
            label={value}
            active={era === value}
            onClick={() => setEra(value)}
          />
        ))}
      </div>

      {searching && (
        <p className="mt-4 text-sm text-muted" role="status">
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-border border-t-accent align-middle" />
          Searching transcripts…
        </p>
      )}

      {!searching && debouncedQuery && (
        <p className="mt-4 text-xs text-muted">
          {episodes.length} episode{episodes.length === 1 ? "" : "s"} matched
          &middot; {transcriptMatchCount} transcript match
          {transcriptMatchCount === 1 ? "" : "es"}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {!searching && episodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
            <p className="text-lg font-semibold text-foreground">
              No episodes found
            </p>
            <p className="mt-1 text-sm text-muted">
              {debouncedQuery
                ? `No episodes match “${debouncedQuery}”. Searched titles, summaries, talking points and transcripts.`
                : "Try a different query, or clear the season / format / era filters."}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Clear filters
            </button>
          </div>
        ) : (
          episodes.map((episode) => (
            <EpisodeCard
              key={episode.slug ?? episode.buzzsproutId}
              episode={episode}
              highlightQuery={debouncedQuery}
            />
          ))
        )}
      </div>
    </div>
  );
}
