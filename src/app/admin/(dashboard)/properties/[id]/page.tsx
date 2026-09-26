import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWizardLocationChain, getWizardTaxonomy } from "@/lib/property-taxonomy";
import { PropertyWizard } from "@/components/admin/property-wizard";
import type { PropertyFormValues } from "@/lib/validations/property";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [property, taxonomy] = await Promise.all([
    prisma.property.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } }, amenities: true },
    }),
    getWizardTaxonomy(),
  ]);

  if (!property) notFound();

  const initialLocation = await getWizardLocationChain(property.cityId, property.localityId);

  const initialValues: Partial<PropertyFormValues> = {
    title: property.title,
    listingType: property.listingType,
    categoryId: property.categoryId,
    cityId: property.cityId,
    localityId: property.localityId,
    neighbourhoodId: property.neighbourhoodId ?? undefined,
    latitude: property.latitude ?? undefined,
    longitude: property.longitude ?? undefined,
    priceAmount: Number(property.priceAmount),
    priceCurrency: property.priceCurrency,
    rentPeriod: property.rentPeriod ?? undefined,
    areaValue: Number(property.areaValue),
    areaUnit: property.areaUnit,
    bedrooms: property.bedrooms ?? undefined,
    bathrooms: property.bathrooms ?? undefined,
    floor: property.floor ?? undefined,
    totalFloors: property.totalFloors ?? undefined,
    facing: property.facing ?? undefined,
    furnishing: property.furnishing ?? undefined,
    propertyAgeYears: property.propertyAgeYears ?? undefined,
    constructionStatus: property.constructionStatus ?? undefined,
    possessionDate: property.possessionDate?.toISOString().slice(0, 10),
    parkingSpaces: property.parkingSpaces ?? undefined,
    amenityIds: property.amenities.map((a) => a.amenityId),
    description: property.description,
    slug: property.slug,
    metaTitle: property.metaTitle ?? undefined,
    metaDescription: property.metaDescription ?? undefined,
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Edit property</h1>
      <div className="mt-6">
        <PropertyWizard
          propertyId={property.id}
          initialValues={initialValues}
          images={property.images}
          taxonomy={taxonomy}
          initialLocation={initialLocation}
        />
      </div>
    </div>
  );
}
