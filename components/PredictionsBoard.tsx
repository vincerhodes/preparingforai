"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  BenchmarkPrediction,
  BenchmarkSide,
  LivePolymarketOdds,
  Prediction,
  PredictionCategory,
  PredictionStatus,
} from "@/lib/types";

type HydratedPrediction = Prediction & { livePolymarket?: LivePolymarketOdds };
export type HydratedBenchmarkPrediction = BenchmarkPrediction & {
  livePolymarket?: LivePolymarketOdds;
};

type CategoryFilter = "All" | PredictionCategory;
type HostFilter =
  | "All"
  | "Jimmy"
  | "Matt"
  | "Guests"
  | "Ed Zitron"
  | "Sam Altman"
  | "All + Benchmarks";
type StatusFilter = "All" | PredictionStatus;

const CATEGORIES: CategoryFilter[] = ["All", "dated", "open-ended"];
const STATUSES: StatusFilter[] = [
  "All",
  "correct",
  "partial",
  "incorrect",
  "pending",
  "unresolved",
];

const BEAR_HOST = "Ed Zitron";
const BULL_HOST = "Sam Altman";

const STATUS_LABELS: Record<PredictionStatus, string> = {
  correct: "Correct",
  partial: "Partially Correct",
  incorrect: "Incorrect",
  pending: "Pending",
  unresolved: "Unresolved",
};

function isGuest(host: string): boolean {
  return host !== "Jimmy" && host !== "Matt";
}

function hostDisplay(host: string): string {
  return isGuest(host) ? "Guest" : host;
}

function hostBadgeClass(host: string): string {
  if (host === "Jimmy") return "border-accent text-accent";
  if (host === "Matt") return "border-sky-400 text-sky-400";
  return "border-slate-400 text-slate-400";
}

function benchmarkBadgeClass(side: BenchmarkSide): string {
  return side === "bear"
    ? "border-rose-400 text-rose-400"
    : "border-emerald-400 text-emerald-400";
}

function statusBadgeClass(status: PredictionStatus): string {
  switch (status) {
    case "correct":
      return "border-emerald-400 text-emerald-400";
    case "partial":
      return "border-amber-400 text-amber-400";
    case "incorrect":
      return "border-rose-400 text-rose-400";
    case "pending":
      return "border-sky-400 text-sky-400";
    default:
      return "border-slate-400 text-slate-400";
  }
}

function formatTimestamp(sec: number): string {
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

type HostScore = {
  total: number;
  hitRate: string;
  correct: number;
  partial: number;
  incorrect: number;
  pending: number;
};

function scoreHost(
  predictions: Array<{ status: PredictionStatus }>,
): HostScore {
  let correct = 0;
  let partial = 0;
  let incorrect = 0;
  let pending = 0;
  for (const prediction of predictions) {
    if (prediction.status === "correct") correct += 1;
    else if (prediction.status === "partial") partial += 1;
    else if (prediction.status === "incorrect") incorrect += 1;
    else pending += 1;
  }
  const verified = correct + incorrect + partial;
  const hitRate = verified
    ? `${Math.round(((correct + 0.5 * partial) / verified) * 100)}%`
    : "—";
  return {
    total: predictions.length,
    hitRate,
    correct,
    partial,
    incorrect,
    pending,
  };
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
      {children}
    </button>
  );
}

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs text-muted">{label}</span>
      {options.map((option) => (
        <Chip key={option} active={value === option} onClick={() => onChange(option)}>
          {option === "dated"
            ? "Dated"
            : option === "open-ended"
              ? "Open-Ended"
              : option === "partial"
                ? "Partially Correct"
                : option === "correct"
                  ? "Correct"
                  : option === "incorrect"
                    ? "Incorrect"
                    : option === "pending"
                      ? "Pending"
                      : option === "unresolved"
                        ? "Unresolved"
                        : option}
        </Chip>
      ))}
    </div>
  );
}

function ScoreBlock({
  name,
  score,
  colorClass,
  badge,
}: {
  name: string;
  score: HostScore;
  colorClass: string;
  badge?: { label: string; className: string };
}) {
  const stats: Array<{ label: string; value: number; valueClass?: string }> = [
    { label: "Total", value: score.total },
    { label: "Hits", value: score.correct, valueClass: "text-emerald-400" },
    { label: "Partial", value: score.partial, valueClass: "text-amber-400" },
    { label: "Misses", value: score.incorrect, valueClass: "text-rose-400" },
    { label: "Pending", value: score.pending, valueClass: "text-sky-400" },
  ];
  return (
    <div className="text-center">
      <div className={`text-3xl font-extrabold ${colorClass}`}>
        {score.hitRate}
      </div>
      <div className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted">
        Verified Hit Rate
      </div>
      <div className="mt-1 font-bold">{name}</div>
      {badge && (
        <span
          className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
      )}
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="min-w-14 rounded-md border border-border bg-background px-2 py-1"
          >
            <b className={`block text-sm ${stat.valueClass ?? ""}`}>
              {stat.value}
            </b>
            <span className="text-[0.65rem] text-muted">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PolymarketCard({ odds }: { odds: LivePolymarketOdds }) {
  const pct = odds.liveYesPct;
  return (
    <div className="mt-3 rounded-lg border border-sky-400/45 bg-sky-400/5 p-3 text-sm">
      <p className="mb-2 text-sm font-semibold">{odds.question}</p>
      {pct !== null ? (
        <>
          <div className="h-2.5 overflow-hidden rounded-full border border-border bg-background">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{pct.toFixed(1)}% Yes</span>
            <span>{(100 - pct).toFixed(1)}% No</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {odds.live ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            ) : (
              <span className="text-muted">Cached odds</span>
            )}
            <span className="text-muted">
              <a
                href={odds.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-accent"
              >
                Open on Polymarket ↗
              </a>
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">
          Live odds unavailable right now — the market link below always has
          the current price.{" "}
          <a
            href={odds.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-accent"
          >
            Open on Polymarket ↗
          </a>
        </p>
      )}
    </div>
  );
}

function useHashFlash(cardId: string) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (window.location.hash !== `#${cardId}`) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(cardId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlash(true);
      }
    }, 120);
    const clearTimer = window.setTimeout(() => setFlash(false), 2000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [cardId]);

  return { flash, setFlash };
}

function OutcomeBlock({
  prediction,
}: {
  prediction: HydratedPrediction | HydratedBenchmarkPrediction;
}) {
  if (prediction.status === "pending" || !prediction.outcomeSummary) {
    return null;
  }
  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(prediction.status)}`}
        >
          {STATUS_LABELS[prediction.status]}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        {prediction.outcomeSummary}
      </p>
      {prediction.verifiedAt && (
        <p className="mt-1 text-xs text-muted">
          Verified{" "}
          <time dateTime={prediction.verifiedAt}>
            {formatDate(prediction.verifiedAt)}
          </time>
        </p>
      )}
      {prediction.evidenceUrl && (
        <a
          href={prediction.evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-accent hover:text-accent-hover"
        >
          External evidence ↗
        </a>
      )}
    </div>
  );
}

function TopicPill({ topic }: { topic: string }) {
  return <TopicPillInner topic={topic} />;
}

function TopicPillInner({ topic }: { topic: string }) {
  const { setSearch } = usePredictionsBoardSearch();
  return (
    <button
      type="button"
      onClick={() => setSearch(`#${topic}`)}
      className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
    >
      #{topic}
    </button>
  );
}

const SearchContext = React.createContext<{
  setSearch: (value: string) => void;
} | null>(null);

function usePredictionsBoardSearch() {
  const context = React.useContext(SearchContext);
  if (!context) {
    throw new Error("TopicPill must be used inside PredictionsBoard");
  }
  return context;
}

function PredictionCard({ prediction }: { prediction: HydratedPrediction }) {
  const cardId = `pred-${prediction.id}`;
  const { flash, setFlash } = useHashFlash(cardId);

  return (
    <article
      id={cardId}
      className={`rounded-lg border bg-surface p-5 transition-colors ${
        flash ? "border-accent" : "border-border"
      }`}
      onAnimationEnd={() => setFlash(false)}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${hostBadgeClass(prediction.host)}`}
        >
          {hostDisplay(prediction.host)}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-muted px-2.5 py-0.5 text-xs font-semibold text-muted">
          {prediction.category === "dated"
            ? `Dated: ${prediction.timeframeLabel}`
            : "Open-Ended"}
        </span>
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(prediction.status)}`}
        >
          {STATUS_LABELS[prediction.status]}
        </span>
      </div>

      <h3 className="text-base font-semibold text-foreground">
        {prediction.claim}
      </h3>
      <blockquote className="my-3 border-l-[3px] border-accent py-0.5 pl-3 text-sm italic text-muted">
        &ldquo;{prediction.quote}&rdquo;
      </blockquote>

      <Link
        href={`/episodes/${prediction.episodeSlug}#t=${Math.floor(prediction.timestampSec)}`}
        className="text-sm text-sky-400 hover:text-accent"
      >
        {prediction.episodeTitle} ·{" "}
        <time dateTime={prediction.episodeDate}>
          {formatDate(prediction.episodeDate)}
        </time>{" "}
        · [{formatTimestamp(prediction.timestampSec)}]
      </Link>

      {prediction.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {prediction.topics.map((topic) => (
            <TopicPill key={topic} topic={topic} />
          ))}
        </div>
      )}

      <OutcomeBlock prediction={prediction} />

      {prediction.livePolymarket && (
        <PolymarketCard odds={prediction.livePolymarket} />
      )}
    </article>
  );
}

function BenchmarkCard({
  prediction,
}: {
  prediction: HydratedBenchmarkPrediction;
}) {
  const cardId = `pred-${prediction.id}`;
  const { flash } = useHashFlash(cardId);

  return (
    <article
      id={cardId}
      className={`rounded-lg border bg-surface p-5 transition-colors ${
        flash ? "border-accent" : "border-border"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${hostBadgeClass(prediction.host)}`}
        >
          {prediction.host}
        </span>
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${benchmarkBadgeClass(prediction.benchmarkSide)}`}
        >
          {prediction.benchmarkSide === "bear" ? "Bear Benchmark" : "Bull Benchmark"}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
          {prediction.roleLabel}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-muted px-2.5 py-0.5 text-xs font-semibold text-muted">
          {prediction.category === "dated"
            ? `Dated: ${prediction.timeframeLabel}`
            : "Open-Ended"}
        </span>
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(prediction.status)}`}
        >
          {STATUS_LABELS[prediction.status]}
        </span>
      </div>

      <h3 className="text-base font-semibold text-foreground">
        {prediction.claim}
      </h3>
      <blockquote className="my-3 border-l-[3px] border-accent py-0.5 pl-3 text-sm italic text-muted">
        &ldquo;{prediction.quote}&rdquo;
      </blockquote>

      <a
        href={prediction.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-sky-400 hover:text-accent"
      >
        {prediction.sourceTitle} ·{" "}
        <time dateTime={prediction.sourceDate}>
          {formatDate(prediction.sourceDate)}
        </time>{" "}
        ↗
      </a>

      {prediction.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {prediction.topics.map((topic) => (
            <TopicPill key={topic} topic={topic} />
          ))}
        </div>
      )}

      <OutcomeBlock prediction={prediction} />

      {prediction.livePolymarket && (
        <PolymarketCard odds={prediction.livePolymarket} />
      )}
    </article>
  );
}

export default function PredictionsBoard({
  predictions,
  benchmarks = [],
}: {
  predictions: HydratedPrediction[];
  benchmarks?: HydratedBenchmarkPrediction[];
}) {
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [host, setHost] = useState<HostFilter>("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base: Array<HydratedPrediction | HydratedBenchmarkPrediction> =
      host === "All + Benchmarks" ? [...predictions, ...benchmarks] : predictions;
    return base.filter((prediction) => {
      if (category !== "All" && prediction.category !== category) return false;
      if (host === "Jimmy" && prediction.host !== "Jimmy") return false;
      if (host === "Matt" && prediction.host !== "Matt") return false;
      if (host === "Guests" && !isGuest(prediction.host)) return false;
      if (host === BEAR_HOST && prediction.host !== BEAR_HOST) return false;
      if (host === BULL_HOST && prediction.host !== BULL_HOST) return false;
      if (status !== "All" && prediction.status !== status) return false;
      if (query) {
        const fields = [
          prediction.claim,
          prediction.quote,
          "episodeTitle" in prediction
            ? prediction.episodeTitle
            : prediction.sourceTitle,
          prediction.outcomeSummary ?? "",
          ...prediction.topics.map((topic) => `#${topic}`),
        ];
        const matches = fields.some((field) =>
          field.toLowerCase().includes(query),
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [predictions, benchmarks, category, host, status, search]);

  const isFiltered =
    category !== "All" ||
    host !== "All" ||
    status !== "All" ||
    search.trim() !== "";

  const clearFilters = () => {
    setCategory("All");
    setHost("All");
    setStatus("All");
    setSearch("");
  };

  const jimmy = useMemo(
    () => scoreHost(predictions.filter((p) => p.host === "Jimmy")),
    [predictions],
  );
  const matt = useMemo(
    () => scoreHost(predictions.filter((p) => p.host === "Matt")),
    [predictions],
  );
  const bear = useMemo(
    () => scoreHost(benchmarks.filter((b) => b.host === BEAR_HOST)),
    [benchmarks],
  );
  const bull = useMemo(
    () => scoreHost(benchmarks.filter((b) => b.host === BULL_HOST)),
    [benchmarks],
  );

  const toggleHost = (value: HostFilter) => {
    setHost((prev) => (prev === value ? "All" : value));
  };

  const toggleBenchmark = (value: "Ed Zitron" | "Sam Altman") => {
    setHost((prev) => (prev === value ? "All" : value));
    requestAnimationFrame(() => {
      feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const totalCount = predictions.length + benchmarks.length;

  return (
    <SearchContext.Provider value={{ setSearch }}>
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <button
            type="button"
            onClick={() => toggleHost("Jimmy")}
            aria-pressed={host === "Jimmy"}
            className={`rounded-lg transition-shadow ${
              host === "Jimmy" ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-border"
            }`}
          >
            <ScoreBlock name="Jimmy" score={jimmy} colorClass="text-accent" />
          </button>
          <div className="justify-self-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
            VS
          </div>
          <button
            type="button"
            onClick={() => toggleHost("Matt")}
            aria-pressed={host === "Matt"}
            className={`rounded-lg transition-shadow ${
              host === "Matt" ? "ring-2 ring-sky-400" : "hover:ring-1 hover:ring-border"
            }`}
          >
            <ScoreBlock name="Matt" score={matt} colorClass="text-sky-400" />
          </button>
        </div>

        {benchmarks.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-xs uppercase tracking-wider text-muted">
              Bull &amp; Bear Benchmarks — click to compare
            </p>
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <button
                type="button"
                onClick={() => toggleBenchmark("Ed Zitron")}
                aria-pressed={host === BEAR_HOST}
                className={`rounded-lg transition-shadow ${
                  host === BEAR_HOST
                    ? "ring-2 ring-rose-400"
                    : "hover:ring-1 hover:ring-border"
                }`}
              >
                <ScoreBlock
                  name={BEAR_HOST}
                  score={bear}
                  colorClass="text-rose-400"
                  badge={{
                    label: "Bear Benchmark · Where's Your Ed At",
                    className:
                      "border-rose-400/60 bg-rose-400/10 text-rose-400",
                  }}
                />
              </button>
              <div className="justify-self-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                VS
              </div>
              <button
                type="button"
                onClick={() => toggleBenchmark("Sam Altman")}
                aria-pressed={host === BULL_HOST}
                className={`rounded-lg transition-shadow ${
                  host === BULL_HOST
                    ? "ring-2 ring-emerald-400"
                    : "hover:ring-1 hover:ring-border"
                }`}
              >
                <ScoreBlock
                  name={BULL_HOST}
                  score={bull}
                  colorClass="text-emerald-400"
                  badge={{
                    label: "Bull Benchmark · OpenAI",
                    className:
                      "border-emerald-400/60 bg-emerald-400/10 text-emerald-400",
                  }}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <ChipRow
          label="Category"
          options={CATEGORIES}
          value={category}
          onChange={(value) => setCategory(value as CategoryFilter)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-muted">Host</span>
          <Chip active={host === "All"} onClick={() => setHost("All")}>
            Show (All)
          </Chip>
          <Chip active={host === "Jimmy"} onClick={() => setHost("Jimmy")}>
            Jimmy
          </Chip>
          <Chip active={host === "Matt"} onClick={() => setHost("Matt")}>
            Matt
          </Chip>
          <Chip active={host === "Guests"} onClick={() => setHost("Guests")}>
            Guests
          </Chip>
          {benchmarks.length > 0 && (
            <>
              <span className="mx-1 text-xs text-muted">|</span>
              <Chip
                active={host === BEAR_HOST}
                onClick={() => setHost(BEAR_HOST)}
              >
                Ed Zitron (Bear)
              </Chip>
              <Chip
                active={host === BULL_HOST}
                onClick={() => setHost(BULL_HOST)}
              >
                Sam Altman (Bull)
              </Chip>
              <Chip
                active={host === "All + Benchmarks"}
                onClick={() => setHost("All + Benchmarks")}
              >
                All + Benchmarks
              </Chip>
            </>
          )}
        </div>
        <ChipRow
          label="Status"
          options={STATUSES}
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search claims, quotes, episodes, topics…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          {isFiltered && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                {filtered.length} of {totalCount} predictions
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={feedRef} className="mt-6 flex scroll-mt-6 flex-col gap-4">
        {totalCount === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted">
            <p className="mb-1 font-semibold text-foreground">
              No predictions yet
            </p>
            <p className="text-sm">
              Predictions extracted from upcoming transcripts will show up here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted">
            <p className="mb-1 font-semibold text-foreground">
              No predictions match
            </p>
            <p className="text-sm">
              Try widening the category, host or status filters, or a different
              search.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((prediction) =>
            "episodeSlug" in prediction ? (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ) : (
              <BenchmarkCard key={prediction.id} prediction={prediction} />
            ),
          )
        )}
      </div>
    </SearchContext.Provider>
  );
}
