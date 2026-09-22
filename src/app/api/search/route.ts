import { NextResponse, type NextRequest } from "next/server";
import { searchProperties } from "@/lib/properties";
import { parseSearchParams } from "@/lib/validations/search";

/** Backs the search results page's "Show more" — same filters, next offset. */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseSearchParams(params);
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);

  const { properties, count, hasMore } = await searchProperties({
    ...filters,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  return NextResponse.json({ properties, count, hasMore });
}
