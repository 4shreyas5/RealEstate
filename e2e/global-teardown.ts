/** Removes every property global-setup.ts created (and nothing else). */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { QA_PUBLISHED_FIXTURE_TITLE } from "./fixtures";

export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.property.findMany({
      where: { title: { startsWith: QA_PUBLISHED_FIXTURE_TITLE } },
      select: { id: true },
    });
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    await prisma.propertyImage.deleteMany({ where: { propertyId: { in: ids } } });
    await prisma.propertyAmenity.deleteMany({ where: { propertyId: { in: ids } } });
    await prisma.auditLogEntry.deleteMany({ where: { propertyId: { in: ids } } });
    const res = await prisma.property.deleteMany({ where: { id: { in: ids } } });
    console.log(`[global-teardown] Removed ${res.count} published fixture propert${res.count === 1 ? "y" : "ies"}`);
  } finally {
    await prisma.$disconnect();
  }
}
