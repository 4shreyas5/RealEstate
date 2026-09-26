import Image from "next/image";
import Link from "next/link";
import { isRenderableImageUrl } from "@/lib/storage";

/** Full-bleed image card with a single overline label — used for both
 * location and category discovery, so the two read as one family. */
export function EditorialImageCard({
  href,
  label,
  imageUrl,
  imageAlt,
  className,
}: {
  href: string;
  label: string;
  imageUrl: string | null;
  imageAlt: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative block aspect-4/5 shrink-0 overflow-hidden rounded-md bg-canvas-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${className ?? ""}`}
    >
      {isRenderableImageUrl(imageUrl) && (
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 25vw, 60vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/70 to-transparent"
      />
      <span className="font-display absolute bottom-4 left-4 text-xl font-medium text-canvas">
        {label}
      </span>
    </Link>
  );
}
