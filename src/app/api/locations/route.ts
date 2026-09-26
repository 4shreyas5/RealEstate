import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Public, read-only dependent lookups for the location hierarchy — the
 * filter sheet loads localities for the chosen city instead of shipping
 * every locality in India to the browser.
 *   /api/locations?level=localities&parent=<cityId>
 *   /api/locations?level=neighbourhoods&parent=<localityId>
 */
export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("level");
  const parent = request.nextUrl.searchParams.get("parent") ?? "";
  if (!ID.test(parent)) return NextResponse.json({ error: "invalid parent" }, { status: 400 });

  let items: { id: string; name: string }[];
  if (level === "localities") {
    items = await prisma.locality.findMany({
      where: { cityId: parent },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    });
  } else if (level === "neighbourhoods") {
    items = await prisma.neighbourhood.findMany({
      where: { localityId: parent },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    });
  } else {
    return NextResponse.json({ error: "invalid level" }, { status: 400 });
  }

  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
