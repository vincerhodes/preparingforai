import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import type { EpisodeEra, EpisodeFormat } from "@/lib/types";

const FORMATS: readonly EpisodeFormat[] = ["debate", "deep-dive", "guest", "special"];
const ERAS: readonly EpisodeEra[] = ["peak", "early", "recent"];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

function parseSeason(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
  return Math.min(value, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q") ?? "";
  const speakerParam = params.get("speaker");
  const formatParam = params.get("format")?.toLowerCase();
  const eraParam = params.get("era")?.toLowerCase();

  const format = FORMATS.find((value) => value === formatParam);
  const era = ERAS.find((value) => value === eraParam);

  const { episodes, transcriptMatches } = searchCatalog({
    query,
    speaker: speakerParam || undefined,
    season: parseSeason(params.get("season")),
    format,
    era,
    limit: parseLimit(params.get("limit")),
  });

  return NextResponse.json({ query, episodes, transcriptMatches });
}
