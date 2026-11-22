import dns from "node:dns";
import type { LivePolymarketOdds, PolymarketMatch } from "./types";

dns.setDefaultResultOrder("ipv4first");

const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const CONCURRENCY = 6;
const oddsCache = new Map<
  string,
  { expiresAt: number; value: LivePolymarketOdds }
>();

function fallbackOdds(match: PolymarketMatch): LivePolymarketOdds {
  return { ...match, liveYesPct: match.cachedYesPct ?? null, live: false };
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function yesPercentage(market: Record<string, unknown>): number | null {
  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices);
  const yesIndex = outcomes.findIndex(
    (outcome) =>
      typeof outcome === "string" && outcome.toLocaleLowerCase() === "yes",
  );
  if (yesIndex < 0) return null;

  const price = Number(prices[yesIndex]);
  if (!Number.isFinite(price) || price < 0) return null;
  const percentage = price <= 1 ? price * 100 : price;
  if (percentage > 100) return null;
  return Math.round(percentage * 10) / 10;
}

export async function fetchLivePolymarketOdds(
  match: PolymarketMatch,
): Promise<LivePolymarketOdds> {
  const cached = oddsCache.get(match.slug);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(match.slug)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!response.ok) throw new Error(`Polymarket returned ${response.status}`);

    const body = (await response.json()) as unknown;
    const markets = Array.isArray(body) ? body : [];
    const market = markets.find(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null,
    );
    if (!market) return fallbackOdds(match);

    const liveYesPct = yesPercentage(market);
    if (liveYesPct === null) return fallbackOdds(match);

    const rawVolume = Number(market.volumeNum ?? market.volume);
    const result: LivePolymarketOdds = {
      ...match,
      liveYesPct,
      live: true,
      ...(Number.isFinite(rawVolume) ? { volume: rawVolume } : {}),
      ...(typeof market.closed === "boolean" ? { closed: market.closed } : {}),
    };
    oddsCache.set(match.slug, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: result,
    });
    return result;
  } catch {
    return fallbackOdds(match);
  }
}

export async function hydratePredictionsWithPolymarket<
  T extends { polymarket?: PolymarketMatch },
>(predictions: T[]): Promise<Array<T & { livePolymarket?: LivePolymarketOdds }>> {
  const uniqueMatches = new Map<string, PolymarketMatch>();
  for (const prediction of predictions) {
    if (prediction.polymarket && !uniqueMatches.has(prediction.polymarket.slug)) {
      uniqueMatches.set(prediction.polymarket.slug, prediction.polymarket);
    }
  }

  const matches = [...uniqueMatches.values()];
  const hydrated = new Map<string, LivePolymarketOdds>();
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < matches.length) {
      const index = nextIndex++;
      const match = matches[index];
      hydrated.set(match.slug, await fetchLivePolymarketOdds(match));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, matches.length) }, () => worker()),
  );

  return predictions.map((prediction) => ({
    ...prediction,
    ...(prediction.polymarket
      ? { livePolymarket: hydrated.get(prediction.polymarket.slug) }
      : {}),
  }));
}
