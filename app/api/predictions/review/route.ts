import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
import { getPredictions } from "@/lib/catalog";
import {
  applyReviewsToPredictions,
  castPredictionVote,
  getReviewMap,
  resolveDispute,
} from "@/lib/reviews";
import type { HostVote, ReviewStatus, Voter } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOTERS: Voter[] = ["jimmy", "matt"];
const HOST_VOTES: HostVote[] = ["approve", "reject"];
const DISPUTE_RESOLUTIONS: ReviewStatus[] = ["approved", "rejected"];

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
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  const resolve =
    "resolve" in payload ? payload.resolve : undefined;
  if (resolve !== undefined) {
    if (
      typeof resolve !== "string" ||
      !DISPUTE_RESOLUTIONS.includes(resolve as ReviewStatus)
    ) {
      return NextResponse.json({ error: "Invalid review" }, { status: 400 });
    }
    const entry = resolveDispute(id, resolve as "approved" | "rejected");
    return NextResponse.json({
      ok: true,
      id,
      reviewStatus: entry.reviewStatus,
      reviewVotes: entry.votes ?? {},
      updatedAt: entry.updatedAt,
    });
  }

  const voter = "voter" in payload ? payload.voter : undefined;
  const vote = "vote" in payload ? payload.vote : undefined;
  if (
    typeof voter !== "string" ||
    !VOTERS.includes(voter as Voter) ||
    (vote !== null &&
      (vote === undefined ||
        typeof vote !== "string" ||
        !HOST_VOTES.includes(vote as HostVote)))
  ) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  const entry = castPredictionVote(
    id,
    voter as Voter,
    (vote ?? null) as HostVote | null,
  );
  return NextResponse.json({
    ok: true,
    id,
    reviewStatus: entry.reviewStatus,
    reviewVotes: entry.votes ?? {},
    updatedAt: entry.updatedAt,
  });
}
