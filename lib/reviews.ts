import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import path from "path";
import type { Prediction, ReviewStatus } from "@/lib/types";

export type ReviewEntry = {
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

export function setPredictionReview(
  id: string,
  reviewStatus: ReviewStatus,
): ReviewEntry {
  const file = reviewsFile();
  const entry = { reviewStatus, updatedAt: new Date().toISOString() };
  const updated = { ...getReviewMap(), [id]: entry };
  mkdirSync(path.dirname(file), { recursive: true });
  reviewCache = null;
  writeFileSync(`${file}.tmp`, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  renameSync(`${file}.tmp`, file);
  return entry;
}

export function applyReviewsToPredictions<T extends Prediction>(
  predictions: T[],
  opts?: { includeRejected?: boolean },
): T[] {
  const reviews = getReviewMap();
  return predictions
    .map((prediction) => ({
      ...prediction,
      reviewStatus:
        reviews[prediction.id]?.reviewStatus ??
        prediction.reviewStatus ??
        "pending_review",
    }))
    .filter(
      (prediction) =>
        opts?.includeRejected === true || prediction.reviewStatus !== "rejected",
    );
}
