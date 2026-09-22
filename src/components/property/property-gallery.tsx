"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export interface GalleryImage {
  id: string;
  url: string;
  altText: string;
  roomLabel: string | null;
}

/** Room-labeled gallery — mirrors how a person mentally tours a home,
 * rather than an undifferentiated stack of photos. */
export function PropertyGallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = images[activeIndex];

  if (images.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="relative block aspect-4/3 w-full overflow-hidden rounded-lg bg-canvas-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:aspect-16/9"
        aria-label={`View full-size photo: ${active.roomLabel ?? active.altText}`}
      >
        <Image
          src={active.url}
          alt={active.altText}
          fill
          // Only the image shown on first paint is a genuine LCP candidate —
          // later thumbnail swaps shouldn't keep forcing priority loading.
          priority={activeIndex === 0}
          sizes="100vw"
          className="object-cover"
        />
        {active.roomLabel && (
          <span className="absolute bottom-4 left-4 rounded-xs bg-ink/70 px-2.5 py-1 text-xs font-medium text-canvas">
            {active.roomLabel}
          </span>
        )}
      </button>

      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photos by room">
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={image.roomLabel ?? `Photo ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`relative block h-16 w-24 shrink-0 overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                index === activeIndex ? "ring-2 ring-accent" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="h-full max-h-none w-full max-w-none bg-ink p-0 backdrop:bg-ink [&:not([open])]:hidden"
        aria-label="Photo viewer"
      >
        <div className="relative flex h-full flex-col">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close photo viewer"
            className="absolute right-4 top-4 z-10 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-ink"
          >
            Close
          </button>
          <div className="relative flex-1">
            <Image src={active.url} alt={active.altText} fill sizes="100vw" className="object-contain" />
          </div>
          <div className="flex items-center justify-center gap-4 bg-ink py-4">
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
              className="text-canvas"
              aria-label="Previous photo"
            >
              ←
            </button>
            <span className="text-sm text-canvas/80">
              {activeIndex + 1} / {images.length} {active.roomLabel && `· ${active.roomLabel}`}
            </span>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
              className="text-canvas"
              aria-label="Next photo"
            >
              →
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
