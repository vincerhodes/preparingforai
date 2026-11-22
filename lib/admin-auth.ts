import { createHash, createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "p4ai_admin";

const TOKEN_TTL_SECONDS = 14 * 86400;

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

function signingKey(): Buffer {
  return createHash("sha256").update(adminPassword()).digest();
}

function signature(payload: string): Buffer {
  return createHmac("sha256", signingKey()).update(payload).digest();
}

export function isAdminConfigured(): boolean {
  return adminPassword().length > 0;
}

export function verifyAdminPassword(input: string): boolean {
  if (!isAdminConfigured()) return false;
  const inputDigest = createHash("sha256").update(input).digest();
  const passwordDigest = createHash("sha256").update(adminPassword()).digest();
  return timingSafeEqual(inputDigest, passwordDigest);
}

export function createAdminToken(): string {
  const expires = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `v1.${expires}`;
  return `${payload}.${signature(payload).toString("hex")}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token || !isAdminConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  if (!/^[a-f0-9]{64}$/i.test(parts[2])) return false;
  const provided = Buffer.from(parts[2], "hex");
  const expected = signature(`v1.${parts[1]}`);
  return timingSafeEqual(provided, expected);
}
