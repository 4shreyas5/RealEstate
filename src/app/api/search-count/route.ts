import { NextResponse, type NextRequest } from "next/server";
import { searchProperties } from "@/lib/properties";
import { parseSearchParams } from "@/lib/validations/search";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseSearchParams(params);
  const { count } = await searchProperties(filters);
  return NextResponse.json({ count });
}
