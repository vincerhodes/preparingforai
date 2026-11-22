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
  PredictionConfidence,
  PredictionStatus,
  ReviewStatus,
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
type ReviewFilter = "All" | "Needs Review" | "Approved" | "Rejected";
type ConfidenceFilter = "All Confidence" | "Low" | "Medium" | "High";

const REVIEW_FILTERS: ReviewFilter[] = [
  "All",
  "Needs Review",
  "Approved",
  "Rejected",
];
const CONFIDENCE_FILTERS: ConfidenceFilter[] = [
  "All Confidence",
  "Low",
  "Medium",
  "High",
];

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

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

function ConfidenceBadge({
  confidence,
  score,
  prominent,
}: {
  confidence: PredictionConfidence;
  score?: number;
  prominent: boolean;
}) {
  const colors: Record<PredictionConfidence, string> = {
    high: "border-emerald-400/60 bg-emerald-400/10 text-emerald-400",
    medium: "border-amber-400/60 bg-amber-400/10 text-amber-400",
    low: "border-rose-400/60 bg-rose-400/10 text-rose-400",
  };
  const label = confidence[0].toUpperCase() + confidence.slice(1);
  const scoreLabel =
    prominent && score !== undefined && Number.isFinite(score)
      ? ` · ${Math.round(score)}%`
      : "";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-semibold ${colors[confidence]} ${
        prominent ? "text-sm" : "text-xs"
      }`}
    >
      {prominent ? `${label}${scoreLabel}` : `${label} confidence`}
    </span>
  );
}

function PredictionCard({
  prediction,
  isAdmin,
  reviewing,
  onReview,
}: {
  prediction: HydratedPrediction;
  isAdmin: boolean;
  reviewing: boolean;
  onReview: (id: string, reviewStatus: ReviewStatus) => void;
}) {
  const cardId = `pred-${prediction.id}`;
  const { flash, setFlash } = useHashFlash(cardId);
  const reviewed =
    prediction.reviewStatus === "approved" ||
    prediction.reviewStatus === "rejected";

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
        {prediction.reviewStatus === "approved" && (
          <span className="inline-flex items-center rounded-full border border-emerald-400/40 px-2.5 py-0.5 text-xs text-emerald-400">
            ✓ Host Verified
          </span>
        )}
        {!isAdmin && prediction.confidence && (
          <ConfidenceBadge
            confidence={prediction.confidence}
            score={prediction.confidenceScore}
            prominent={false}
          />
        )}
      </div>

      {isAdmin && (
        <div className="mb-3">
          {prediction.confidence ? (
            <ConfidenceBadge
              confidence={prediction.confidence}
              score={prediction.confidenceScore}
              prominent
            />
          ) : (
            <span className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-sm font-semibold text-muted">
              Confidence unrated
            </span>
          )}
          {prediction.confidenceReason && (
            <p className="mt-2 text-sm italic text-muted">
              {prediction.confidenceReason}
            </p>
          )}
        </div>
      )}

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

      {isAdmin && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={reviewing}
            onClick={() => onReview(prediction.id, "approved")}
            className="rounded-lg border border-emerald-400/60 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-50"
          >
            Approve ✓
          </button>
          <button
            type="button"
            disabled={reviewing}
            onClick={() => onReview(prediction.id, "rejected")}
            className="rounded-lg border border-rose-400/60 bg-rose-400/10 px-3 py-1.5 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-400/20 disabled:cursor-wait disabled:opacity-50"
          >
            Reject ✕
          </button>
          {reviewed && (
            <button
              type="button"
              disabled={reviewing}
              onClick={() => onReview(prediction.id, "pending_review")}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-foreground disabled:cursor-wait disabled:opacity-50"
            >
              Undo
            </button>
          )}
        </div>
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
  predictions: initialPredictions,
  benchmarks = [],
  initialIsAdmin = false,
}: {
  predictions: HydratedPrediction[];
  benchmarks?: HydratedBenchmarkPrediction[];
  initialIsAdmin?: boolean;
}) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [host, setHost] = useState<HostFilter>("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("All");
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>("All Confidence");
  const [lowestConfidenceFirst, setLowestConfidenceFirst] = useState(false);
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(new Set());
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [adminError, setAdminError] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLogin) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowLogin(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showLogin]);

  useEffect(() => {
    if (!adminError) return;
    const timer = window.setTimeout(() => setAdminError(""), 5000);
    return () => window.clearTimeout(timer);
  }, [adminError]);

  const reviewCounts = useMemo(
    () => ({
      approved: predictions.filter((p) => p.reviewStatus === "approved").length,
      pending: predictions.filter(
        (p) => (p.reviewStatus ?? "pending_review") === "pending_review",
      ).length,
      rejected: predictions.filter((p) => p.reviewStatus === "rejected").length,
    }),
    [predictions],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base: Array<HydratedPrediction | HydratedBenchmarkPrediction> =
      host === "All + Benchmarks" ? [...predictions, ...benchmarks] : predictions;
    return base
      .filter((prediction) => {
        if (category !== "All" && prediction.category !== category) return false;
        if (host === "Jimmy" && prediction.host !== "Jimmy") return false;
        if (host === "Matt" && prediction.host !== "Matt") return false;
        if (host === "Guests" && !isGuest(prediction.host)) return false;
        if (host === BEAR_HOST && prediction.host !== BEAR_HOST) return false;
        if (host === BULL_HOST && prediction.host !== BULL_HOST) return false;
        if (status !== "All" && prediction.status !== status) return false;
        if ("episodeSlug" in prediction) {
          const currentReview = prediction.reviewStatus ?? "pending_review";
          if (!isAdmin && currentReview === "rejected") return false;
          if (isAdmin && reviewFilter !== "All") {
            const expectedReview: ReviewStatus =
              reviewFilter === "Approved"
                ? "approved"
                : reviewFilter === "Rejected"
                  ? "rejected"
                  : "pending_review";
            if (currentReview !== expectedReview) return false;
          }
          if (
            isAdmin &&
            confidenceFilter !== "All Confidence" &&
            prediction.confidence !== confidenceFilter.toLowerCase()
          ) {
            return false;
          }
        }
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
      })
      .sort((a, b) => {
        if (!isAdmin || !lowestConfidenceFirst) return 0;
        const aScore =
          "episodeSlug" in a ? (a.confidenceScore ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
        const bScore =
          "episodeSlug" in b ? (b.confidenceScore ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
        return aScore - bScore;
      });
  }, [
    predictions,
    benchmarks,
    category,
    host,
    status,
    search,
    isAdmin,
    reviewFilter,
    confidenceFilter,
    lowestConfidenceFirst,
  ]);

  const isFiltered =
    category !== "All" ||
    host !== "All" ||
    status !== "All" ||
    search.trim() !== "" ||
    (isAdmin && reviewFilter !== "All") ||
    (isAdmin && confidenceFilter !== "All Confidence");

  const clearFilters = () => {
    setCategory("All");
    setHost("All");
    setStatus("All");
    setSearch("");
    setReviewFilter("All");
    setConfidenceFilter("All Confidence");
  };

  const scoredPredictions = useMemo(
    () => predictions.filter((prediction) => prediction.reviewStatus !== "rejected"),
    [predictions],
  );
  const jimmy = useMemo(
    () => scoreHost(scoredPredictions.filter((p) => p.host === "Jimmy")),
    [scoredPredictions],
  );
  const matt = useMemo(
    () => scoreHost(scoredPredictions.filter((p) => p.host === "Matt")),
    [scoredPredictions],
  );
  const bear = useMemo(
    () => scoreHost(benchmarks.filter((b) => b.host === BEAR_HOST)),
    [benchmarks],
  );
  const bull = useMemo(
    () => scoreHost(benchmarks.filter((b) => b.host === BULL_HOST)),
    [benchmarks],
  );

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginPending(true);
    setLoginError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Login failed"));
      }
      const reviewResponse = await fetch("/api/predictions/review");
      if (!reviewResponse.ok) {
        throw new Error(
          await responseError(reviewResponse, "Could not load admin reviews"),
        );
      }
      const payload = (await reviewResponse.json()) as {
        predictions: HydratedPrediction[];
      };
      setPredictions((current) => {
        const liveOdds = new Map(
          current.map((prediction) => [prediction.id, prediction.livePolymarket]),
        );
        return payload.predictions.map((prediction) => ({
          ...prediction,
          livePolymarket: liveOdds.get(prediction.id),
        }));
      });
      setIsAdmin(true);
      setShowLogin(false);
      setPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoginPending(false);
    }
  };

  const handleLogout = async () => {
    setAdminError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not log out"));
      }
      setIsAdmin(false);
      setPredictions((current) =>
        current.filter((prediction) => prediction.reviewStatus !== "rejected"),
      );
      setReviewFilter("All");
      setConfidenceFilter("All Confidence");
      setLowestConfidenceFirst(false);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Could not log out");
    }
  };

  const handleReview = async (id: string, reviewStatus: ReviewStatus) => {
    const previousStatus =
      predictions.find((prediction) => prediction.id === id)?.reviewStatus ??
      "pending_review";
    setAdminError("");
    setReviewingIds((current) => new Set(current).add(id));
    setPredictions((current) =>
      current.map((prediction) =>
        prediction.id === id ? { ...prediction, reviewStatus } : prediction,
      ),
    );
    try {
      const response = await fetch("/api/predictions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reviewStatus }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not save review"));
      }
    } catch (error) {
      setPredictions((current) =>
        current.map((prediction) =>
          prediction.id === id
            ? { ...prediction, reviewStatus: previousStatus }
            : prediction,
        ),
      );
      setAdminError(
        `${error instanceof Error ? error.message : "Could not save review"}. The change was reverted.`,
      );
    } finally {
      setReviewingIds((current) => {
        const updated = new Set(current);
        updated.delete(id);
        return updated;
      });
    }
  };

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
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={isAdmin ? handleLogout : () => setShowLogin(true)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            isAdmin
              ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20"
              : "border-border text-muted hover:border-accent hover:text-foreground"
          }`}
        >
          {isAdmin ? "Admin Mode · Log out" : "Admin"}
        </button>
      </div>
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

      {isAdmin && (
        <section className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">Admin Review</h2>
            <p className="text-xs text-muted">
              Approved: {reviewCounts.approved} · Needs Review: {reviewCounts.pending} · Rejected: {reviewCounts.rejected}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted">Review</span>
            {REVIEW_FILTERS.map((filter) => (
              <Chip
                key={filter}
                active={reviewFilter === filter}
                onClick={() => setReviewFilter(filter)}
              >
                {filter}
              </Chip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CONFIDENCE_FILTERS.map((filter) => (
              <Chip
                key={filter}
                active={confidenceFilter === filter}
                onClick={() => setConfidenceFilter(filter)}
              >
                {filter}
              </Chip>
            ))}
            <button
              type="button"
              aria-pressed={lowestConfidenceFirst}
              onClick={() => setLowestConfidenceFirst((current) => !current)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                lowestConfidenceFirst
                  ? "border-accent bg-accent font-semibold text-background"
                  : "border-border bg-surface text-muted hover:border-accent hover:text-foreground"
              }`}
            >
              Sort: Lowest Confidence First
            </button>
          </div>
        </section>
      )}

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
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                isAdmin={isAdmin}
                reviewing={reviewingIds.has(prediction.id)}
                onReview={handleReview}
              />
            ) : (
              <BenchmarkCard key={prediction.id} prediction={prediction} />
            ),
          )
        )}
      </div>

      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogin(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="admin-login-title" className="text-lg font-bold">
                Admin login
              </h2>
              <button
                type="button"
                aria-label="Close admin login"
                onClick={() => setShowLogin(false)}
                className="rounded-md px-2 py-1 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">
              Enter the shared admin password to review predictions.
            </p>
            <form onSubmit={handleLogin} className="mt-5">
              <label htmlFor="admin-password" className="text-xs font-semibold text-muted">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoFocus
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              {loginError && (
                <p role="alert" className="mt-3 text-sm text-rose-400">
                  {loginError}
                </p>
              )}
              <button
                type="submit"
                disabled={loginPending}
                className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
              >
                {loginPending ? "Logging in…" : "Log in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {adminError && (
        <div
          role="alert"
          className="fixed bottom-5 right-5 z-50 max-w-md rounded-lg border border-rose-400/60 bg-surface px-4 py-3 text-sm text-rose-400 shadow-xl"
        >
          {adminError}
        </div>
      )}
    </SearchContext.Provider>
  );
}
