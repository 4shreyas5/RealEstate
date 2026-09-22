const rows = [
  { label: "WhatsApp number", value: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER },
  { label: "Contact phone", value: process.env.NEXT_PUBLIC_CONTACT_PHONE },
  { label: "Site URL", value: process.env.NEXT_PUBLIC_SITE_URL },
  { label: "Mapbox token configured", value: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? "Yes" : "No" },
];

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Settings</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        These are configured via environment variables, not editable here yet.
      </p>

      <dl className="mt-6 divide-y divide-border rounded-md border border-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
            <dt className="text-ink-secondary">{row.label}</dt>
            <dd className="font-medium text-ink">{row.value || "Not set"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
