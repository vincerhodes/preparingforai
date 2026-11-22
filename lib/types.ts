export type EpisodeFormat = "debate" | "deep-dive" | "guest" | "special";
export type EpisodeEra = "peak" | "early" | "recent";

export type Chapter = {
  title: string;
  startTime: number;
};

export type TranscriptTurn = {
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
  chapterIndex: number;
};

export type EpisodeMeta = {
  slug: string;
  buzzsproutId: string;
  title: string;
  date: string;
  season: number | null;
  durationSec: number;
  format: EpisodeFormat;
  era: EpisodeEra;
  audioUrl: string;
  buzzsproutUrl: string;
  description: string;
  summary: string;
  keyTalkingPoints: string[];
  hostStances: { jimmy: string[]; matt: string[] };
  speakers: string[];
  chapterCount: number;
  turnCount: number;
  predictionIds: string[];
};

export type EpisodeDetail = EpisodeMeta & {
  chapters: Chapter[];
  turns: TranscriptTurn[];
};

export type PredictionStatus =
  | "correct"
  | "incorrect"
  | "partial"
  | "pending"
  | "unresolved";
export type PredictionCategory = "dated" | "open-ended";

export type PolymarketMatch = {
  slug: string;
  question: string;
  url: string;
  cachedYesPct?: number;
  cachedAt?: string;
};

export type LivePolymarketOdds = PolymarketMatch & {
  liveYesPct: number | null;
  volume?: number;
  closed?: boolean;
  live: boolean;
};

export type Prediction = {
  id: string;
  episodeSlug: string;
  episodeTitle: string;
  episodeDate: string;
  timestampSec: number;
  host: string;
  claim: string;
  quote: string;
  category: PredictionCategory;
  targetDate?: string;
  timeframeLabel: string;
  status: PredictionStatus;
  outcomeSummary?: string;
  evidenceUrl?: string;
  verifiedAt?: string;
  polymarket?: PolymarketMatch;
  topics: string[];
};

export type BenchmarkSide = "bear" | "bull";
export type BenchmarkPrediction = {
  id: string;
  host: string; // e.g. "Ed Zitron" | "Sam Altman"
  roleLabel: string; // e.g. "Where's Your Ed At · AI Bear" | "OpenAI CEO · AI Bull"
  benchmarkSide: BenchmarkSide;
  sourceTitle: string;
  sourceUrl: string;
  sourceDate: string; // YYYY-MM-DD
  claim: string;
  quote: string;
  category: PredictionCategory;
  targetDate?: string;
  timeframeLabel: string;
  status: PredictionStatus;
  outcomeSummary?: string;
  evidenceUrl?: string;
  verifiedAt?: string;
  polymarket?: PolymarketMatch;
  topics: string[];
};

export type HostProfile = {
  host: "Jimmy" | "Matt";
  bio: string;
  coreWorldview: string[];
  recurringThemes: string[];
  peakEraHighlights: string[];
  voicePatterns: string[];
  evolutionNotes: string[];
};

export type TranscriptSnippetMatch = {
  episodeSlug: string;
  episodeTitle: string;
  episodeDate: string;
  season: number | null;
  format: EpisodeFormat;
  era: EpisodeEra;
  speaker: string;
  startTime: number;
  snippet: string;
  score: number;
};
