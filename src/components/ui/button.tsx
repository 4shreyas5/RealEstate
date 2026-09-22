import Link from "next/link";
import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-canvas hover:bg-accent-hover",
  ghost:
    "border border-border-strong text-ink hover:bg-canvas-alt",
};

interface ButtonOwnProps {
  variant?: ButtonVariant;
}

type ButtonProps<T extends ElementType> = ButtonOwnProps &
  { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof ButtonOwnProps | "as">;

/** The system has exactly two button styles — primary (one per view) and ghost. No third style. */
export function Button<T extends ElementType = "button">({
  as,
  variant = "primary",
  className,
  ...props
}: ButtonProps<T>) {
  const Component = as ?? "button";
  return (
    <Component className={cn(base, variants[variant], className)} {...props} />
  );
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ButtonOwnProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props} />
  );
}
