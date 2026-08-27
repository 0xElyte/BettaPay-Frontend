import { randomBytes, createHash } from "crypto";

/**
 * Magic-link token store + per-email send limiter (issue #466).
 *
 * In-memory, process-local — fine for preview/dev and mirrors the pattern in
 * app/api/newsletter/route.ts. Swap the two Maps for Redis (or a `magic_link`
 * table with a unique-once constraint) before running more than one instance.
 */

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SENDS_PER_WINDOW = 3;

export type MagicVerifyError = "invalid" | "expired" | "used";

interface TokenRecord {
  emailHash: string;
  email: string;
  expiresAt: number;
  consumedAt: number | null;
}

interface SendRecord {
  timestamps: number[];
}

const g = globalThis as unknown as {
  __bpMagicTokens?: Map<string, TokenRecord>;
  __bpMagicSends?: Map<string, SendRecord>;
};

const tokens = (g.__bpMagicTokens ??= new Map<string, TokenRecord>());
const sends = (g.__bpMagicSends ??= new Map<string, SendRecord>());

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function sweep(now: number): void {
  for (const [key, rec] of tokens) {
    if (rec.expiresAt < now && (rec.consumedAt === null || rec.consumedAt < now - TOKEN_TTL_MS)) {
      tokens.delete(key);
    }
  }
}

/** Returns `false` when this email has hit the send cap for the current window. */
export function canSendMagicLink(email: string): boolean {
  const now = Date.now();
  const key = hashEmail(email);
  const rec = sends.get(key) ?? { timestamps: [] };
  rec.timestamps = rec.timestamps.filter((t) => t > now - SEND_WINDOW_MS);
  if (rec.timestamps.length >= MAX_SENDS_PER_WINDOW) {
    sends.set(key, rec);
    return false;
  }
  rec.timestamps.push(now);
  sends.set(key, rec);
  return true;
}

/** Issues a fresh single-use token for `email`. */
export function issueMagicToken(email: string): { token: string; expiresAt: number } {
  const now = Date.now();
  sweep(now);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now + TOKEN_TTL_MS;
  tokens.set(token, {
    emailHash: hashEmail(email),
    email: email.trim().toLowerCase(),
    expiresAt,
    consumedAt: null,
  });
  return { token, expiresAt };
}

/**
 * Verifies and **consumes** a token. A second call with the same token
 * returns `"used"`; an unknown token `"invalid"`; a stale one `"expired"`.
 */
export function consumeMagicToken(
  token: string,
): { ok: true; email: string } | { ok: false; error: MagicVerifyError } {
  const now = Date.now();
  const rec = tokens.get(token);
  if (!rec) return { ok: false, error: "invalid" };
  if (rec.consumedAt !== null) return { ok: false, error: "used" };
  if (rec.expiresAt < now) return { ok: false, error: "expired" };
  rec.consumedAt = now;
  tokens.set(token, rec);
  return { ok: true, email: rec.email };
}
