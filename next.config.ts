import type { NextConfig } from "next";

const supabasePattern = {
  protocol: "https" as const,
  hostname: "*.supabase.co",
  pathname: "/storage/v1/object/public/**",
};

// Dev-only placeholder photography (see prisma/seed.ts). Excluded from the
// config entirely outside development, so a production build cannot render
// (or silently depend on) picsum.photos even if seed data ever leaked in —
// next/image refuses any host not in this list.
const picsumPattern = {
  protocol: "https" as const,
  hostname: "picsum.photos",
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns:
      process.env.NODE_ENV === "production" ? [supabasePattern] : [supabasePattern, picsumPattern],
  },
};

export default nextConfig;
