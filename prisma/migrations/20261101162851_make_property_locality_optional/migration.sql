-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_localityId_fkey";

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "localityId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "localities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
