import {
  formatTimestamp,
  getBenchmarkPredictions,
  getCatalog,
  getEpisodeByIdOrSlug,
  getHostProfiles,
  getPredictions,
  searchCatalog,
} from "@/lib/catalog";
import { hydratePredictionsWithPolymarket } from "@/lib/polymarket";
import type {
  BenchmarkPrediction,
  EpisodeEra,
  EpisodeFormat,
  LivePolymarketOdds,
  PredictionCategory,
  PredictionStatus,
  TranscriptSnippetMatch,
} from "@/lib/types";
import { site } from "@/site.config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVER_INFO = {
  name: "preparingforai-mcp",
  version: "1.0.0",
} as const;
const PROTOCOL_VERSION = "2025-03-26";
const ENDPOINT = `${site.url}/api/mcp`;
const DOCS = `${site.url}/mcp`;
const FORMATS = ["debate", "deep-dive", "guest", "special"] as const;
const ERAS = ["peak", "early", "recent"] as const;
const PREDICTION_CATEGORIES = ["dated", "open-ended"] as const;
const PREDICTION_STATUSES = [
  "correct",
  "incorrect",
  "partial",
  "pending",
  "unresolved",
] as const;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
};

const TOOLS = [
  {
    name: "search_transcripts",
    description:
      "Search full speaker-labeled transcripts, episode summaries, and talking points. Returns episode URLs and timestamped transcript excerpts.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words or phrase to search for." },
        speaker: { type: "string", description: "Filter transcript matches by speaker." },
        season: { type: "number", description: "Filter by season number." },
        format: { type: "string", enum: FORMATS },
        era: { type: "string", enum: ERAS },
        limit: {
          type: "number",
          description: "Maximum episode and transcript matches to return.",
          default: 10,
          maximum: 30,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_episode",
    description:
      "Get an episode by slug or Buzzsprout ID, including metadata, summary, talking points, Jimmy and Matt's stances, chapters, predictions, and an optional transcript.",
    inputSchema: {
      type: "object",
      properties: {
        id_or_slug: { type: "string", description: "Episode slug or Buzzsprout ID." },
        include_transcript: {
          type: "boolean",
          description: "Include the full or filtered speaker-labeled transcript.",
          default: false,
        },
        speaker: { type: "string", description: "Filter included transcript turns by speaker." },
        chapter_index: {
          type: "number",
          description: "Filter included transcript turns by zero-based chapter index.",
        },
      },
      required: ["id_or_slug"],
      additionalProperties: false,
    },
  },
  {
    name: "list_episodes",
    description:
      "List the newest-first episode catalog with slugs, dates, durations, formats, eras, and summaries.",
    inputSchema: {
      type: "object",
      properties: {
        season: { type: "number", description: "Filter by season number." },
        format: { type: "string", enum: FORMATS },
        era: { type: "string", enum: ERAS },
        limit: {
          type: "number",
          description: "Maximum episodes to return.",
          default: 25,
          maximum: 100,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_predictions",
    description:
      "Search the predictions ledger by claim, quote, topic, host, category, or status, optionally including live Polymarket odds. Add include_benchmarks to also search the Bull & Bear benchmark predictions (Ed Zitron, Sam Altman) — benchmarks are included automatically when host is a benchmark pundit.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional words to find in predictions and topics." },
        host: { type: "string", description: "Filter by host, such as Jimmy or Matt." },
        category: { type: "string", enum: PREDICTION_CATEGORIES },
        status: { type: "string", enum: PREDICTION_STATUSES },
        include_polymarket: {
          type: "boolean",
          description: "Hydrate matching markets with live Polymarket odds.",
          default: true,
        },
        include_benchmarks: {
          type: "boolean",
          description: "Also include Bull & Bear benchmark predictions (Ed Zitron, Sam Altman). Automatically enabled when host matches a benchmark pundit.",
          default: false,
        },
        limit: {
          type: "number",
          description: "Maximum predictions to return.",
          default: 25,
          maximum: 100,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_host_profile",
    description:
      "Get a host's distilled worldview, recurring themes, peak-era highlights, voice patterns, evolution notes, and prediction scorecard.",
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", enum: ["Jimmy", "Matt"] },
      },
      required: ["host"],
      additionalProperties: false,
    },
  },
];

type JsonRpcId = string | number | null;
type JsonObject = Record<string, unknown>;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(args: JsonObject, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Parameter "${key}" must be a non-empty string.`);
  }
  return value.trim();
}

function optionalString(args: JsonObject, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Parameter "${key}" must be a non-empty string when provided.`);
  }
  return value.trim();
}

function optionalBoolean(args: JsonObject, key: string, fallback: boolean): boolean {
  const value = args[key];
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new Error(`Parameter "${key}" must be a boolean.`);
  }
  return value;
}

function optionalInteger(
  args: JsonObject,
  key: string,
  options: { default?: number; min?: number; max?: number } = {},
): number | undefined {
  const value = args[key];
  if (value === undefined) return options.default;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Parameter "${key}" must be an integer.`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`Parameter "${key}" must be at least ${options.min}.`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(`Parameter "${key}" must be at most ${options.max}.`);
  }
  return value;
}

function optionalEnum<T extends string>(
  args: JsonObject,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`Parameter "${key}" must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function validateKeys(args: JsonObject, allowed: string[]): void {
  const unknown = Object.keys(args).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new Error(`Unknown parameter${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.`);
  }
}

function episodeUrl(slug: string): string {
  return `${site.url}/episodes/${slug}`;
}

function serializeMatch(match: TranscriptSnippetMatch) {
  return {
    ...match,
    episodeUrl: episodeUrl(match.episodeSlug),
    timestamp: `[${formatTimestamp(match.startTime)}]`,
  };
}

function serializePrediction<T extends { episodeSlug: string; timestampSec: number }>(prediction: T): T & {
  episodeUrl: string;
  timestamp: string;
} {
  return {
    ...prediction,
    episodeUrl: episodeUrl(prediction.episodeSlug),
    timestamp: `[${formatTimestamp(prediction.timestampSec)}]`,
  };
}

async function executeTool(name: string, args: JsonObject): Promise<string> {
  switch (name) {
    case "search_transcripts": {
      validateKeys(args, ["query", "speaker", "season", "format", "era", "limit"]);
      const query = requiredString(args, "query");
      const results = searchCatalog({
        query,
        speaker: optionalString(args, "speaker"),
        season: optionalInteger(args, "season", { min: 1 }),
        format: optionalEnum(args, "format", FORMATS) as EpisodeFormat | undefined,
        era: optionalEnum(args, "era", ERAS) as EpisodeEra | undefined,
        limit: optionalInteger(args, "limit", { default: 10, min: 1, max: 30 }),
      });
      return JSON.stringify(
        {
          query,
          episodes: results.episodes.map(({ episode, matchedSnippet }) => ({
            ...episode,
            url: episodeUrl(episode.slug),
            ...(matchedSnippet ? { matchedSnippet: serializeMatch(matchedSnippet) } : {}),
          })),
          transcriptMatches: results.transcriptMatches.map(serializeMatch),
        },
        null,
        2,
      );
    }

    case "get_episode": {
      validateKeys(args, ["id_or_slug", "include_transcript", "speaker", "chapter_index"]);
      const idOrSlug = requiredString(args, "id_or_slug");
      const includeTranscript = optionalBoolean(args, "include_transcript", false);
      const speaker = optionalString(args, "speaker");
      const chapterIndex = optionalInteger(args, "chapter_index", { min: 0 });
      const episode = getEpisodeByIdOrSlug(idOrSlug);
      if (!episode) throw new Error(`No episode found for "${idOrSlug}".`);

      const { turns, chapters, ...metadata } = episode;
      const transcript = includeTranscript
        ? turns
            .filter(
              (turn) =>
                (!speaker || turn.speaker.toLocaleLowerCase() === speaker.toLocaleLowerCase()) &&
                (chapterIndex === undefined || turn.chapterIndex === chapterIndex),
            )
            .map((turn) => ({ ...turn, timestamp: `[${formatTimestamp(turn.startTime)}]` }))
        : undefined;
      const predictions = getPredictions()
        .filter((prediction) => prediction.episodeSlug === episode.slug)
        .map(serializePrediction);

      return JSON.stringify(
        {
          ...metadata,
          url: episodeUrl(episode.slug),
          chapters: chapters.map((chapter, index) => ({
            ...chapter,
            index,
            timestamp: `[${formatTimestamp(chapter.startTime)}]`,
          })),
          predictions,
          ...(transcript ? { transcript } : {}),
        },
        null,
        2,
      );
    }

    case "list_episodes": {
      validateKeys(args, ["season", "format", "era", "limit"]);
      const season = optionalInteger(args, "season", { min: 1 });
      const format = optionalEnum(args, "format", FORMATS);
      const era = optionalEnum(args, "era", ERAS);
      const limit = optionalInteger(args, "limit", { default: 25, min: 1, max: 100 }) ?? 25;
      const episodes = getCatalog()
        .filter(
          (episode) =>
            (season === undefined || episode.season === season) &&
            (!format || episode.format === format) &&
            (!era || episode.era === era),
        )
        .slice(0, limit)
        .map((episode) => ({
          ...episode,
          url: episodeUrl(episode.slug),
          duration: formatTimestamp(episode.durationSec),
        }));
      return JSON.stringify({ count: episodes.length, episodes }, null, 2);
    }

    case "search_predictions": {
      validateKeys(args, ["query", "host", "category", "status", "include_polymarket", "include_benchmarks", "limit"]);
      const query = optionalString(args, "query");
      const host = optionalString(args, "host");
      const category = optionalEnum(args, "category", PREDICTION_CATEGORIES) as
        | PredictionCategory
        | undefined;
      const status = optionalEnum(args, "status", PREDICTION_STATUSES) as
        | PredictionStatus
        | undefined;
      const includePolymarket = optionalBoolean(args, "include_polymarket", true);
      const includeBenchmarksParam = optionalBoolean(args, "include_benchmarks", false);
      const limit = optionalInteger(args, "limit", { default: 25, min: 1, max: 100 }) ?? 25;
      const queryTokens = query?.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
      const benchmarkPundits = ["Ed Zitron", "Sam Altman"] as const;
      const hostMatchesBenchmark = !!host &&
        benchmarkPundits.some(
          (pundit) => pundit.toLocaleLowerCase() === host.toLocaleLowerCase(),
        );
      const includeBenchmarks = includeBenchmarksParam || hostMatchesBenchmark;
      let predictions = getPredictions()
        .filter((prediction) => {
          const searchable = [
            prediction.claim,
            prediction.quote,
            prediction.episodeTitle,
            prediction.host,
            ...prediction.topics,
          ]
            .join(" ")
            .toLocaleLowerCase();
          return (
            queryTokens.every((token) => searchable.includes(token)) &&
            (!host || prediction.host.toLocaleLowerCase() === host.toLocaleLowerCase()) &&
            (!category || prediction.category === category) &&
            (!status || prediction.status === status)
          );
        })
        .slice(0, limit);

      const hydrated = includePolymarket
        ? await hydratePredictionsWithPolymarket(predictions)
        : predictions;
      predictions = hydrated;

      let benchmarks: Array<
        BenchmarkPrediction & { livePolymarket?: LivePolymarketOdds }
      > = [];
      if (includeBenchmarks) {
        const matched = getBenchmarkPredictions()
          .filter((benchmark) => {
            const searchable = [
              benchmark.claim,
              benchmark.quote,
              benchmark.sourceTitle,
              benchmark.host,
              benchmark.roleLabel,
              ...benchmark.topics,
            ]
              .join(" ")
              .toLocaleLowerCase();
            return (
              queryTokens.every((token) => searchable.includes(token)) &&
              (!host || benchmark.host.toLocaleLowerCase() === host.toLocaleLowerCase()) &&
              (!category || benchmark.category === category) &&
              (!status || benchmark.status === status)
            );
          })
          .slice(0, limit);
        benchmarks = includePolymarket
          ? await hydratePredictionsWithPolymarket(matched)
          : matched;
      }

      return JSON.stringify(
        {
          count: predictions.length + benchmarks.length,
          predictions: predictions.map(serializePrediction),
          ...(includeBenchmarks
            ? {
                benchmarks: benchmarks.map((benchmark) => ({
                  ...benchmark,
                  benchmarkLabel:
                    benchmark.benchmarkSide === "bear" ? "Bear Benchmark" : "Bull Benchmark",
                  source: `${benchmark.sourceTitle} (${benchmark.sourceDate}) — ${benchmark.sourceUrl}`,
                })),
              }
            : {}),
        },
        null,
        2,
      );
    }

    case "get_host_profile": {
      validateKeys(args, ["host"]);
      const host = optionalEnum(args, "host", ["Jimmy", "Matt"] as const);
      if (!host) throw new Error('Parameter "host" is required and must be "Jimmy" or "Matt".');
      const profile = getHostProfiles()[host];
      if (!profile) throw new Error(`No host profile found for ${host}.`);
      const predictions = getPredictions().filter(
        (prediction) => prediction.host.toLocaleLowerCase() === host.toLocaleLowerCase(),
      );
      const scorecard = {
        total: predictions.length,
        correct: predictions.filter((prediction) => prediction.status === "correct").length,
        incorrect: predictions.filter((prediction) => prediction.status === "incorrect").length,
        partial: predictions.filter((prediction) => prediction.status === "partial").length,
        pending: predictions.filter((prediction) => prediction.status === "pending").length,
        unresolved: predictions.filter((prediction) => prediction.status === "unresolved").length,
      };
      const rated = scorecard.correct + scorecard.incorrect + scorecard.partial;
      return JSON.stringify(
        {
          ...profile,
          predictionScorecard: {
            ...scorecard,
            accuracyPct: rated
              ? Math.round(((scorecard.correct + scorecard.partial * 0.5) / rated) * 1000) / 10
              : null,
          },
        },
        null,
        2,
      );
    }

    default:
      throw new Error(`Unknown tool "${name}". Use tools/list to see available tools.`);
  }
}

async function handleRpc(value: unknown): Promise<JsonObject | null> {
  if (!isObject(value) || value.jsonrpc !== "2.0" || typeof value.method !== "string") {
    return rpcError(null, -32600, "Invalid Request");
  }
  if (
    value.id !== undefined &&
    typeof value.id !== "string" &&
    typeof value.id !== "number" &&
    value.id !== null
  ) {
    return rpcError(null, -32600, "Invalid Request: id must be a string, number, or null.");
  }

  const id = (value.id ?? null) as JsonRpcId;
  if (value.id === undefined) return null;

  switch (value.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "Explore the Preparing for AI podcast catalog hosted by Jimmy and Matt. Search speaker-labeled transcripts and episode summaries, inspect episodes and host stances, research the predictions ledger, and compare the hosts' worldviews. Include episode URLs and timestamps when citing findings.",
      });
    case "notifications/initialized":
      return rpcResult(id, {});
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      try {
        if (!isObject(value.params) || typeof value.params.name !== "string") {
          throw new Error('tools/call requires a params object with a tool "name".');
        }
        const rawArgs = value.params.arguments;
        if (rawArgs !== undefined && !isObject(rawArgs)) {
          throw new Error("Tool arguments must be a JSON object.");
        }
        const text = await executeTool(value.params.name, rawArgs ?? {});
        return rpcResult(id, { content: [{ type: "text", text }], isError: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : "The tool call failed.";
        return rpcResult(id, {
          content: [{ type: "text", text: message }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${value.method}`);
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function GET(): Response {
  return json({
    ...SERVER_INFO,
    endpoint: ENDPOINT,
    docs: DOCS,
    protocolVersion: PROTOCOL_VERSION,
    tools: TOOLS.map(({ name, description }) => ({ name, description })),
  });
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error: malformed JSON."));
  }

  const isBatch = Array.isArray(payload);
  const requests: unknown[] = isBatch ? (payload as unknown[]) : [payload];
  if (requests.length === 0) {
    return json(rpcError(null, -32600, "Invalid Request: batch must not be empty."));
  }

  const responses = (await Promise.all(requests.map(handleRpc))).filter(
    (response): response is JsonObject => response !== null,
  );

  if (!responses.length) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }
  return json(isBatch ? responses : responses[0]);
}
