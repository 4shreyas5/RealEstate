import { getWizardTaxonomy } from "@/lib/property-taxonomy";
import { PropertyForm } from "@/components/admin/property-form";

export default async function NewPropertyPage() {
  const taxonomy = await getWizardTaxonomy();

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Add property</h1>
      <div className="mt-6">
        <PropertyForm propertyId={null} initialValues={{}} images={[]} taxonomy={taxonomy} />
      </div>
    </div>
  );
}
