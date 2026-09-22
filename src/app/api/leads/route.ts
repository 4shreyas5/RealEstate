import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validations/lead";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 10_000; // Generously above any real enquiry payload.

// The entire public conversion surface is enquiry — every WhatsApp/Call
// click and form submit writes one lead record here (first-party only: no
// third-party pixels, no fingerprinting). Unauthenticated by design — an
// enquiry is exactly the thing a visitor hasn't signed in to submit.
export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), { max: 20, windowMs: 60_000 })) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  try {
    await prisma.lead.create({
      data: {
        propertyId: data.propertyId || undefined,
        cityId: data.cityId || undefined,
        localityId: data.localityId || undefined,
        name: data.name || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        message: data.message || undefined,
        source: data.source,
        actionType: data.actionType,
        // Timestamp and source are always server-set — never trust a
        // client-supplied value for either.
        utmSource: data.utmSource || undefined,
        utmMedium: data.utmMedium || undefined,
        utmCampaign: data.utmCampaign || undefined,
      },
    });
  } catch {
    // A bad propertyId/cityId/localityId (real foreign keys) lands here —
    // return a clean 400 rather than leaking a Prisma error/stack trace.
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
