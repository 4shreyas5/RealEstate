import { getWizardTaxonomy } from "@/lib/property-taxonomy";
import { PropertyWizard } from "@/components/admin/property-wizard";

export default async function NewPropertyPage() {
  const taxonomy = await getWizardTaxonomy();

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Add property</h1>
      <div className="mt-6">
        <PropertyWizard propertyId={null} initialValues={{}} images={[]} taxonomy={taxonomy} />
      </div>
    </div>
  );
}
