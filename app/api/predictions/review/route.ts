import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
import { getPredictions } from "@/lib/catalog";
import {
  applyReviewsToPredictions,
  getReviewMap,
  setPredictionReview,
} from "@/lib/reviews";
import type { ReviewStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_STATUSES: ReviewStatus[] = [
  "approved",
  "pending_review",
  "rejected",
];

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    reviews: getReviewMap(),
    predictions: applyReviewsToPredictions(getPredictions(), {
      includeRejected: true,
    }),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }
  const id = "id" in payload ? payload.id : undefined;
  const reviewStatus =
    "reviewStatus" in payload ? payload.reviewStatus : undefined;
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof reviewStatus !== "string" ||
    !REVIEW_STATUSES.includes(reviewStatus as ReviewStatus)
  ) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  const { updatedAt } = setPredictionReview(
    id,
    reviewStatus as ReviewStatus,
  );
  return NextResponse.json({ ok: true, id, reviewStatus, updatedAt });
}
