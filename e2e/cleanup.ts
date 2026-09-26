/** Removes ONLY properties created by the E2E write tests (title starts with the QA prefix). */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
const prisma = new PrismaClient();
const QA_TITLE_PREFIX = "QA TEST PROPERTY — DO NOT PUBLISH";
(async () => {
  const qa = await prisma.property.findMany({ where: { title: { startsWith: QA_TITLE_PREFIX } }, select: { id: true } });
  const ids = qa.map((p) => p.id);
  await prisma.auditLogEntry.deleteMany({ where: { propertyId: { in: ids } } });
  const res = await prisma.property.deleteMany({ where: { id: { in: ids } } });
  console.log(`removed ${res.count} QA test propert${res.count === 1 ? "y" : "ies"}`);
})().finally(() => prisma.$disconnect());
