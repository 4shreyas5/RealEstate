import { prisma } from "@/lib/prisma";
import {
  createCity,
  createCountryAndState,
  createLocality,
  createNeighbourhood,
} from "./actions";

const input = "rounded-sm border border-border bg-surface px-3 py-2 text-sm";

export default async function AdminLocationsPage() {
  const [countries, states, cities, localities] = await Promise.all([
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.stateProvince.findMany({ include: { country: true }, orderBy: { name: "asc" } }),
    prisma.city.findMany({ include: { state: true }, orderBy: { name: "asc" } }),
    prisma.locality.findMany({ include: { city: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-12">
      <h1 className="font-display text-2xl font-medium text-ink">Locations</h1>

      <section>
        <h2 className="font-medium text-ink">Country &amp; state</h2>
        <form action={createCountryAndState} className="mt-3 flex flex-wrap gap-2">
          <input name="countryName" placeholder="Country name" className={input} required />
          <input name="countryCode" placeholder="ISO code (IN)" maxLength={2} className={input} required />
          <input name="stateName" placeholder="State / province name" className={input} required />
          <button type="submit" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas">
            Add
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-secondary">
          {countries.length} countries, {states.length} states/provinces on file.
        </p>
      </section>

      <section>
        <h2 className="font-medium text-ink">Cities</h2>
        <form action={createCity} className="mt-3 flex flex-wrap gap-2">
          <input name="name" placeholder="City name" className={input} required />
          <select name="stateId" className={input} required>
            <option value="">State</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}, {s.country.name}
              </option>
            ))}
          </select>
          <input name="imageUrl" placeholder="Image URL (optional)" className={`${input} flex-1`} />
          <button type="submit" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas">
            Add
          </button>
        </form>
        <ul className="mt-4 divide-y divide-border rounded-md border border-border">
          {cities.map((city) => (
            <li key={city.id} className="px-3 py-2 text-sm text-ink">
              {city.name} <span className="text-ink-secondary">— {city.state.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium text-ink">Localities</h2>
        <form action={createLocality} className="mt-3 flex flex-wrap gap-2">
          <input name="name" placeholder="Locality name" className={input} required />
          <select name="cityId" className={input} required>
            <option value="">City</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="imageUrl" placeholder="Image URL (optional)" className={`${input} flex-1`} />
          <button type="submit" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas">
            Add
          </button>
        </form>
        <ul className="mt-4 divide-y divide-border rounded-md border border-border">
          {localities.map((locality) => (
            <li key={locality.id} className="px-3 py-2 text-sm text-ink">
              {locality.name} <span className="text-ink-secondary">— {locality.city.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium text-ink">Neighbourhoods (optional)</h2>
        <form action={createNeighbourhood} className="mt-3 flex flex-wrap gap-2">
          <input name="name" placeholder="Neighbourhood name" className={input} required />
          <select name="localityId" className={input} required>
            <option value="">Locality</option>
            {localities.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
