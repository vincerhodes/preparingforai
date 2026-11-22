#!/usr/bin/env node
// Match pending predictions in data/predictions.json to live Polymarket contracts.
//
// Usage:
//   node scripts/match-polymarket.mjs            # write high-confidence matches
//   node scripts/match-polymarket.mjs --dry-run  # print candidates + scores only
//   node scripts/match-polymarket.mjs --force    # re-match even if polymarket set

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PREDICTIONS_PATH = join(ROOT, "data", "predictions.json");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const GAMMA = "https://gamma-api.polymarket.com";
const SEARCH_URL = `${GAMMA}/public-search?q={q}&limit_per_type=8`;
const MARKETS_URL = `${GAMMA}/markets?active=true&closed=false&limit=100`;

// Words too generic to count as "strong entity" evidence.
const STOPWORDS = new Set([
  "will", "with", "that", "this", "from", "have", "has", "had", "than",
  "then", "them", "they", "their", "about", "into", "over", "under",
  "year", "years", "next", "by", "the", "and", "for", "are", "was",
  "were", "not", "but", "who", "what", "when", "where", "which", "predict",
  "prediction", "market", "markets", "before", "after", "more", "most",
  "there", "here", "end", "within", "long", "term", "days", "months",
  "month", "week", "weeks", "soon", "much", "many", "some", "very",
  "2024", "2025", "2026", "2027", "2028", "2029", "2030",
]);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) || []).filter(
    (t) => !STOPWORDS.has(t)
  );
}

function keywordsFor(prediction) {
  const seen = new Set();
  const words = [
    ...tokenize(prediction.claim || ""),
    ...(prediction.topics || []).flatMap((t) => tokenize(t)),
  ];
  return words.filter((w) => (seen.has(w) ? false : (seen.add(w), true)));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function searchMarkets(keywords) {
  const markets = [];
  const seen = new Set();
  const add = (list) => {
    for (const m of list || []) {
      if (m && m.id !== undefined && !seen.has(m.id)) {
        seen.add(m.id);
        markets.push(m);
      }
    }
  };

  // Concise keyword query from the strongest claim words.
  const query = keywords.slice(0, 5).join(" ");
  if (query) {
    try {
      const data = await fetchJson(SEARCH_URL.replace("{q}", encodeURIComponent(query)));
      add(data.markets);
      // Events carry nested markets.
      for (const ev of data.events || []) {
        if (Array.isArray(ev.markets)) add(ev.markets);
      }
    } catch {
      // fall through to the broad /markets scan
    }
  }

  try {
    add(await fetchJson(MARKETS_URL));
  } catch {
    // network/API failure — work with whatever search returned
  }

  return markets;
}

function yesNoOutcomes(market) {
  let outcomes = market.outcomes;
  if (typeof outcomes === "string") {
    try {
      outcomes = JSON.parse(outcomes);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(outcomes) || outcomes.length !== 2) return null;
  const lower = outcomes.map((o) => String(o).toLowerCase());
  if (!lower.includes("yes") || !lower.includes("no")) return null;
  return outcomes;
}

function yesPct(market) {
  let prices = market.outcomePrices;
  if (typeof prices === "string") {
    try {
      prices = JSON.parse(prices);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(prices) && prices.length >= 1) {
    const n = Number(prices[0]);
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  return undefined;
}

function scoreMarket(market, keywords) {
  const question = String(market.question || "").toLowerCase();
  if (!question) return { score: 0, hits: [] };

  const hits = keywords.filter((w) => question.includes(w));
  const strongHits = hits.filter((w) => w.length >= 4 || /[0-9]/.test(w));
  const coverage = hits.length / Math.max(1, Math.min(keywords.length, 8));

  // Strict: need at least one strong entity-ish token AND decent coverage.
  let score = strongHits.length * 2 + hits.length;
  if (strongHits.length === 0) score = 0; // no entity anchor — reject
  if (hits.length < 2) score = Math.min(score, 2); // single-word match is weak
  score += Math.round(coverage * 4);

  return { score, hits };
}

function toMatch(market) {
  const slug = market.slug || market.eventSlug;
  return {
    slug: String(slug || market.id),
    question: market.question,
    url: `https://polymarket.com/event/${market.eventSlug || market.slug || market.id}`,
    ...(yesPct(market) !== undefined
      ? { cachedYesPct: yesPct(market), cachedAt: new Date().toISOString() }
      : { cachedAt: new Date().toISOString() }),
  };
}

const HIGH_CONFIDENCE = 8;

async function main() {
  const raw = await readFile(PREDICTIONS_PATH, "utf8");
  const data = JSON.parse(raw);
  const predictions = Array.isArray(data) ? data : data.predictions || [];

  const pending = predictions.filter(
    (p) =>
      p &&
      p.status === "pending" &&
      (FORCE || !p.polymarket) &&
      p.claim
  );

  if (pending.length === 0) {
    console.log("No pending predictions without a Polymarket match.");
    return;
  }

  console.log(`Inspecting ${pending.length} pending prediction(s)…`);

  let matched = 0;
  for (const pred of pending) {
    const keywords = keywordsFor(pred);
    const markets = await searchMarkets(keywords);

    const candidates = markets
      .filter(
        (m) =>
          m.active &&
          !m.closed &&
          yesNoOutcomes(m) &&
          String(m.question || "").length > 10
      )
      .map((m) => ({ market: m, ...scoreMarket(m, keywords) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (candidates.length === 0) {
      console.log(`\n✗ ${pred.id}: no candidate Polymarket markets`);
      continue;
    }

    console.log(`\n■ ${pred.id} — ${pred.claim}`);
    for (const c of candidates) {
      console.log(
        `  score ${String(c.score).padStart(2)}  ${c.hits.join(", ") || "-"}  → ${c.market.question}`
      );
    }

    const best = candidates[0];
    if (best.score < HIGH_CONFIDENCE) {
      console.log("  (below confidence threshold — skipped)");
      continue;
    }

    if (DRY_RUN) {
      console.log("  [dry-run] would attach:", toMatch(best.market).url);
    } else {
      pred.polymarket = toMatch(best.market);
      matched += 1;
      console.log("  ✓ matched:", pred.polymarket.url);
    }
  }

  if (!DRY_RUN && matched > 0) {
    const out = Array.isArray(data) ? predictions : { ...data, predictions };
    await writeFile(PREDICTIONS_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`\nWrote ${matched} match(es) to data/predictions.json`);
  } else if (DRY_RUN) {
    console.log("\nDry run — nothing written.");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
