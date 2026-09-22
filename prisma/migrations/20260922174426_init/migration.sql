-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "RentPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('SQFT', 'SQM', 'ACRE', 'HECTARE', 'MARLA', 'KANAL');

-- CreateEnum
CREATE TYPE "Facing" AS ENUM ('NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED');

-- CreateEnum
CREATE TYPE "ConstructionStatus" AS ENUM ('UNDER_CONSTRUCTION', 'READY_TO_MOVE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNDER_OFFER', 'UNAVAILABLE', 'SOLD', 'RENTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadActionType" AS ENUM ('WHATSAPP', 'CALL', 'FORM');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states_provinces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "states_provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "stateId" TEXT NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "localities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighbourhoods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "localityId" TEXT NOT NULL,

    CONSTRAINT "neighbourhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "localityId" TEXT NOT NULL,
    "neighbourhoodId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "priceAmount" DECIMAL(14,2) NOT NULL,
    "priceCurrency" TEXT NOT NULL,
    "rentPeriod" "RentPeriod",
    "areaValue" DECIMAL(10,2) NOT NULL,
    "areaUnit" "AreaUnit" NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "facing" "Facing",
    "furnishing" "Furnishing",
    "propertyAgeYears" INTEGER,
    "constructionStatus" "ConstructionStatus",
    "possessionDate" TIMESTAMP(3),
    "parkingSpaces" INTEGER,
    "description" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "roomLabel" TEXT,
    "position" INTEGER NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "propertyId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("propertyId","amenityId")
);

-- CreateTable
CREATE TABLE "featured_properties" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_cities" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "featured_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "cityId" TEXT,
    "localityId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL,
    "actionType" "LeadActionType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log_entries" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "propertyId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "states_provinces_countryId_name_key" ON "states_provinces"("countryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "localities_cityId_slug_key" ON "localities"("cityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "neighbourhoods_localityId_slug_key" ON "neighbourhoods"("localityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_slug_key" ON "amenities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_cityId_status_idx" ON "properties"("cityId", "status");

-- CreateIndex
CREATE INDEX "properties_localityId_status_idx" ON "properties"("localityId", "status");

-- CreateIndex
CREATE INDEX "properties_status_categoryId_idx" ON "properties"("status", "categoryId");

-- CreateIndex
CREATE INDEX "properties_status_priceAmount_idx" ON "properties"("status", "priceAmount");

-- CreateIndex
CREATE INDEX "properties_status_featured_idx" ON "properties"("status", "featured");

-- CreateIndex
CREATE INDEX "properties_status_publishedAt_idx" ON "properties"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "property_images_propertyId_position_idx" ON "property_images"("propertyId", "position");

-- CreateIndex
CREATE INDEX "property_amenities_amenityId_idx" ON "property_amenities"("amenityId");

-- CreateIndex
CREATE UNIQUE INDEX "featured_properties_propertyId_key" ON "featured_properties"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "featured_cities_cityId_key" ON "featured_cities"("cityId");

-- CreateIndex
CREATE INDEX "leads_propertyId_idx" ON "leads"("propertyId");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "audit_log_entries_propertyId_idx" ON "audit_log_entries"("propertyId");

-- AddForeignKey
ALTER TABLE "states_provinces" ADD CONSTRAINT "states_provinces_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states_provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "localities" ADD CONSTRAINT "localities_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighbourhoods" ADD CONSTRAINT "neighbourhoods_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "localities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "localities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_neighbourhoodId_fkey" FOREIGN KEY ("neighbourhoodId") REFERENCES "neighbourhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_properties" ADD CONSTRAINT "featured_properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_cities" ADD CONSTRAINT "featured_cities_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "localities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
