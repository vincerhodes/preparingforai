import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import path from "path";
import type { HostVote, Prediction, ReviewStatus, ReviewVotes, Voter } from "@/lib/types";

export type ReviewEntry = {
  votes?: ReviewVotes;
  reviewStatus: ReviewStatus;
  updatedAt: string;
};

export type ReviewMap = Record<string, ReviewEntry>;

let reviewCache: ReviewMap | null = null;

function reviewsFile(): string {
  return (
    process.env.REVIEWS_FILE ||
    path.join(process.cwd(), "data", "prediction-reviews.json")
  );
}

export function getReviewMap(): ReviewMap {
  if (reviewCache) return reviewCache;
  try {
    reviewCache = JSON.parse(readFileSync(reviewsFile(), "utf8")) as ReviewMap;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    reviewCache = {};
  }
  return reviewCache;
}

function writeReviewMap(updated: ReviewMap): void {
  const file = reviewsFile();
  mkdirSync(path.dirname(file), { recursive: true });
  reviewCache = null;
  writeFileSync(`${file}.tmp`, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  renameSync(`${file}.tmp`, file);
}

export function computeReviewStatus(
  votes?: ReviewVotes,
  legacyStatus?: ReviewStatus,
): ReviewStatus {
  if (votes?.jimmy === "approve" && votes?.matt === "approve") return "approved";
  if (votes?.jimmy === "reject" && votes?.matt === "reject") return "rejected";
  if (
    (votes?.jimmy === "approve" && votes?.matt === "reject") ||
    (votes?.jimmy === "reject" && votes?.matt === "approve")
  ) {
    return "disputed";
  }
  if (votes?.jimmy || votes?.matt) return "pending_review";
  return legacyStatus ?? "pending_review";
}

export function setPredictionReview(
  id: string,
  reviewStatus: ReviewStatus,
): ReviewEntry {
  const existing = getReviewMap()[id];
  const entry: ReviewEntry = {
    votes: existing?.votes,
    reviewStatus,
    updatedAt: new Date().toISOString(),
  };
  const updated = { ...getReviewMap(), [id]: entry };
  writeReviewMap(updated);
  return entry;
}

export function castPredictionVote(
  id: string,
  voter: Voter,
  vote: HostVote | null,
): ReviewEntry {
  const existing = getReviewMap()[id];
  const votes: ReviewVotes = { ...existing?.votes };
  if (vote === null) {
    delete votes[voter];
  } else {
    votes[voter] = vote;
  }
  const entry: ReviewEntry = {
    votes,
    reviewStatus: computeReviewStatus(votes, existing?.reviewStatus),
    updatedAt: new Date().toISOString(),
  };
  const updated = { ...getReviewMap(), [id]: entry };
  writeReviewMap(updated);
  return entry;
}

export function resolveDispute(
  id: string,
  resolution: "approved" | "rejected",
): ReviewEntry {
  const v: HostVote = resolution === "approved" ? "approve" : "reject";
  const entry: ReviewEntry = {
    votes: { jimmy: v, matt: v },
    reviewStatus: resolution,
    updatedAt: new Date().toISOString(),
  };
  const updated = { ...getReviewMap(), [id]: entry };
  writeReviewMap(updated);
  return entry;
}

export function applyReviewsToPredictions<T extends Prediction>(
  predictions: T[],
  opts?: { includeRejected?: boolean },
): T[] {
  const reviews = getReviewMap();
  return predictions
    .map((prediction) => {
      const entry = reviews[prediction.id];
      return {
        ...prediction,
        reviewStatus: computeReviewStatus(
          entry?.votes,
          entry?.reviewStatus ?? prediction.reviewStatus,
        ),
        reviewVotes: entry?.votes ?? {},
      };
    })
    .filter(
      (prediction) =>
        opts?.includeRejected === true || prediction.reviewStatus !== "rejected",
    );
}
