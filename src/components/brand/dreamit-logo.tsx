import { cn } from "@/lib/utils";

/**
 * DreamIT mark: a "D" drawn as a single arched doorway with a slim "I"
 * pillar standing inside it — the D and I read as one monogram, and the
 * arch reads as a threshold rather than a house.
 */
export function DreamITMark({ className, variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  const tile = variant === "light" ? "var(--color-canvas)" : "var(--color-accent)";
  const stroke = variant === "light" ? "var(--color-ink)" : "var(--color-canvas)";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("h-7 w-7 shrink-0 sm:h-8 sm:w-8", className)}
    >
      <rect width="32" height="32" rx="7" fill={tile} />
      <path
        d="M9.5 8.5H15a7.5 7.5 0 0 1 0 15H9.5V8.5Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="14.25" y="12.5" width="2.5" height="11" rx="0.5" fill={stroke} />
    </svg>
  );
}

/**
 * `dark` = for light backgrounds (ink wordmark, moss tile).
 * `light` = for dark backgrounds (canvas wordmark, canvas tile).
 */
export function DreamITLogo({
  variant = "dark",
  className,
  markClassName,
}: {
  variant?: "dark" | "light";
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      role="img"
      aria-label="DreamIT"
      className={cn(
        "inline-flex items-center gap-2 font-display leading-none sm:gap-2.5",
        variant === "light" ? "text-canvas" : "text-ink",
        className,
      )}
    >
      <DreamITMark variant={variant} className={markClassName} />
      <span aria-hidden="true" className="text-[1.4rem] tracking-tight sm:text-[1.75rem]">
        <span className="font-normal">Dream</span>
        <span className="font-semibold">IT</span>
      </span>
    </span>
  );
}
