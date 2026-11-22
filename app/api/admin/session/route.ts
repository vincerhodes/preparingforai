import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  isAdminConfigured,
  verifyAdminToken,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const configured = isAdminConfigured();
  return NextResponse.json({
    isAdmin:
      configured &&
      verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value),
    configured,
  });
}
