import { NextResponse } from "next/server";
import { z } from "zod";

const newsletterSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

// In-memory rate limiting — max 3 submissions per email per hour.
interface RateLimitRecord {
  timestamps: number[];
}

const globalForRateLimit = global as unknown as {
  newsletterRateLimitMap?: Map<string, RateLimitRecord>;
};

const rateLimitMap =
  globalForRateLimit.newsletterRateLimitMap || new Map<string, RateLimitRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.newsletterRateLimitMap = rateLimitMap;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { timestamps: [] };
  const oneHourAgo = now - 3_600_000;
  record.timestamps = record.timestamps.filter((t) => t > oneHourAgo);
  if (record.timestamps.length >= 3) return false;
  record.timestamps.push(now);
  rateLimitMap.set(key, record);
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Honeypot: bots fill a hidden "website" field; reject silently.
    if (body.website && String(body.website).trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const result = newsletterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `${ip}:${email}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Log the subscription. Replace with your email provider (e.g. Resend,
    // Mailchimp, ConvertKit) when one is configured.
    console.log(`[Newsletter] New subscriber: ${email} from ${ip}`);
    // if (process.env.NEWSLETTER_API_KEY) { await addToList(email); }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Newsletter] POST error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
