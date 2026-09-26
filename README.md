# DreamIT

A curated property discovery platform. Internal team-only listings — no public
submissions, no owner/agent accounts, no online booking or payment. Users
discover properties and contact the team via WhatsApp, call, or an enquiry
form.

Stack: Next.js (App Router) + TypeScript, Tailwind v4, Supabase (Postgres +
Auth + Storage) via Prisma, Mapbox for the map/list discovery experience.

Design tokens and the full UX specification live in the project's Design
System & UX Specification doc — `src/app/globals.css` implements the tokens
directly; do not add one-off colors, spacing, radius, or shadow values.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com).

3. **Environment variables** — see `.env.example` for the full, categorized
   list (required in every environment / required for the map / reserved-
   unused / development-only). Copy it to `.env.local` and fill in the
   required values from Project Settings → Database and → API. Also copy
   `DATABASE_URL`/`DIRECT_URL` into a root `.env` (Prisma CLI reads `.env`,
   Next.js reads `.env.local`).

4. **Run migrations and generate the client**

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed taxonomy data** (country/state/city/localities, categories,
   amenities — the launch city is Lucknow; edit `prisma/seed.ts` to change it):

   ```bash
   npm run db:seed
   ```

6. **Set up Storage** — run [`supabase/storage-setup.sql`](supabase/storage-setup.sql)
   once in the Supabase SQL editor. It creates the public-read
   `property-images` bucket (JPG/PNG/WebP/AVIF, 10 MB max) and policies that
   let only `admin_users` upload/replace/delete. Uploads happen client-side
   from the admin (authenticated via Supabase Auth), so no service-role key
   is needed. Photos are served from
   `https://<project>.supabase.co/storage/v1/object/public/property-images/...`,
   the only remote host production allows (`next.config.ts`).

7. **Create your first admin user**
   - Supabase dashboard → Authentication → Add user (email + password).
   - Copy that user's UUID.
   - Insert a matching row in `admin_users` (SQL editor):

     ```sql
     insert into admin_users (id, email, name, role)
     values ('<user-uuid>', 'you@example.com', 'Your Name', 'ADMIN');
     ```

   Being authenticated alone does not grant admin access — only a matching
   `admin_users` row does (see `src/lib/admin-auth.ts`).

8. **Run the app**

   ```bash
   npm run dev
   ```

   Public site: [http://localhost:3000](http://localhost:3000)
   Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Locations (pan-India)

The location hierarchy is database-driven: Country → State/UT → City → Locality → Neighbourhood.
Nothing in the UI hardcodes a city.

```bash
npm run db:seed:locations          # DRY RUN — prints exactly what would be inserted, writes nothing
npm run db:seed:locations:apply    # inserts the missing rows (insert-only, idempotent)
```

The seed (`prisma/seed-locations.ts`, data in `prisma/data/india-locations.ts`) adds India, all
28 states + 8 UTs, ~170 major cities and an initial set of localities for the biggest markets. It
never updates or deletes existing rows; re-running inserts 0 rows. Public navigation, the
homepage search, the filter sheet and the sitemap only offer cities that have published
listings; admins add further localities/neighbourhoods under **Admin → Locations**.

## Database URLs

- `DATABASE_URL` — Supabase **transaction pooler** (port 6543) with `?pgbouncer=true`
  (append `&connection_limit=1` on serverless hosts such as Vercel). Used by the running app.
- `DIRECT_URL` — direct/session connection (port 5432). Used only by `prisma migrate`.

## End-to-end tests

```bash
npm run build && npm run e2e                                   # public + redirect tests against a local prod build
BASE_URL=https://www.dreamit.co.in npm run e2e                 # read-only tests against a deployment
E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run e2e             # + admin location-wizard tests
E2E_ALLOW_WRITES=1 … npm run e2e                               # + creates "QA TEST PROPERTY — DO NOT PUBLISH" (use a test DB)
npm run e2e:cleanup                                            # removes only those QA properties
```

Every test fails on uncaught JS errors, console errors (incl. hydration), any HTTP ≥ 400,
failed requests and broken images.

## Project structure

- `src/app/(public)` — public site (homepage, search, property detail, etc.)
- `src/app/admin/(dashboard)` — authenticated admin (properties, leads,
  taxonomies); `src/app/admin/login` sits outside the auth-gated group.
- `src/components/ui` — shared primitives (buttons, inputs — token-driven).
- `src/components/layout` — public nav/footer.
- `src/components/admin` — admin-only components (sidebar, property wizard,
  image manager).
- `prisma/schema.prisma` — the property/location/lead data model. Generic by
  design: no field hardcodes India, INR, sq ft, or a single-city assumption.
- `src/lib/supabase` — browser/server Supabase clients and the session-refresh
  helper used by `src/proxy.ts` (Next's replacement for `middleware.ts`).

## Implementation status

Built: design tokens, public nav/footer shell, property data model, admin
auth, admin property CRUD (stepped creation wizard, table with bulk/row
actions, image manager with alt-text and publish-quality gating), dashboard
stats, property card/grid, homepage (editorial sections, not a SaaS
hero/features/testimonials stack), search/results with a real list+map split
view (Mapbox, clustering, synced selection), the advanced filter sheet with a
live result count, property detail page (room-labeled gallery, sticky
contact), WhatsApp/Call/Enquiry flows with first-party lead capture,
location + category pages, admin leads/locations/categories/amenities/
featured/settings/users/audit screens, sitemap.xml/robots.txt/JSON-LD.

Not yet built: a settings model that's actually editable from the admin
(currently read-only, env-driven), and a full visual QA pass against real
(non-placeholder) photography. Performance, accessibility, security, and SEO
hardening have been done — see the phase report for specifics and remaining
known limitations.

## Production hardening notes

- **Rate limiting on `/api/leads`** is in-memory and per-instance
  (`src/lib/rate-limit.ts`). It slows down abuse on any single server
  process but does not coordinate across multiple instances on a
  horizontally-scaled platform. Swap in a shared store (e.g. Upstash Redis)
  behind the same `isRateLimited`/`getClientIp` signatures before relying on
  it as a hard ceiling.
- **Dev-only placeholder photography** (`picsum.photos`, used only by
  `prisma/seed.ts`) is excluded from `next.config.ts`'s allowed image hosts
  whenever `NODE_ENV === "production"` — a production build cannot render
  those URLs even if seed data ever ended up in a real database.
- **Settings page** (`/admin/settings`) is read-only, reflecting environment
  variables — there is no editable settings model yet.
