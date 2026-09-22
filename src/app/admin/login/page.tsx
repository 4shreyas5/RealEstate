import type { Metadata } from "next";
import { login } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = "/admin" } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-medium text-ink">Admin sign in</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Internal team access only.
        </p>

        {error && (
          <p className="mt-4 rounded-sm border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <form action={login} className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="text-xs font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-sm bg-accent px-4 py-3 text-sm font-medium text-canvas hover:bg-accent-hover"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
