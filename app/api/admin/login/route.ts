import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin login not configured" },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const password =
    typeof payload === "object" && payload !== null && "password" in payload
      ? payload.password
      : undefined;
  if (typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: createAdminToken(),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 86400,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
