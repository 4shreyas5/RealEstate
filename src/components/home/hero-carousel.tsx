"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Slide = {
  id: string;
  src: string;
  /** Per-image focal point so a tall (mobile) crop keeps the house itself
   * in frame instead of centering blindly on sky/lawn/pool. */
  objectPosition: string;
};

// Six supplied real-estate photographs cycling behind the hero content.
const SLIDES: Slide[] = [
  { id: "shingle-porch", src: "/images/hero/carousel-01.jpg", objectPosition: "center 40%" },
  { id: "modern-pool-villa", src: "/images/hero/carousel-02.jpg", objectPosition: "65% 48%" },
  { id: "autumn-cottage", src: "/images/hero/carousel-03.jpg", objectPosition: "center 42%" },
  { id: "poolside-glass", src: "/images/hero/carousel-04.jpg", objectPosition: "42% 50%" },
  { id: "red-porch-home", src: "/images/hero/carousel-05.jpg", objectPosition: "center 40%" },
  { id: "brick-two-story", src: "/images/hero/carousel-06.jpg", objectPosition: "center 42%" },
];

const INTERVAL_MS = 6000;

/**
 * Decorative hero background: a slow crossfade between the six supplied
 * property photos, every one shown at full strength — nothing layers a
 * static, opacity-reduced image on top of this carousel, which is what
 * previously hid every slide behind one permanently washed-out photo.
 *
 * `children` (the real hero content — headline, Buy/Rent, search) is
 * rendered through this same client boundary via a `display: contents`
 * wrapper purely so hover/focus anywhere in the hero can pause the
 * autoplay; the children themselves stay whatever they already were
 * (server-rendered) and this component adds no data fetching, so the
 * first slide is present in the initial HTML with no client-side wait.
 */
export function HeroCarousel({ children }: { children: ReactNode }) {
  const slides = SLIDES;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = query.matches;
    const onChange = () => {
      reducedMotion.current = query.matches;
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  return (
    <div
      className="contents"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="absolute inset-0" aria-hidden="true">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slide.src}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: slide.objectPosition }}
            />
          </div>
        ))}
        {/* Scrim: strongest at the bottom (search bar), easing through the
            headline zone, fully transparent only in the top sliver of the
            image — the content block here runs nearly the full hero
            height, so the fade has to reach that high to keep the
            headline readable. The photo itself is never dimmed as a whole
            or tinted; this is localized contrast for text, not a filter. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(28,27,25,0.85) 0%, rgba(28,27,25,0.68) 28%, rgba(28,27,25,0.5) 48%, rgba(28,27,25,0.28) 68%, rgba(28,27,25,0.06) 86%, rgba(28,27,25,0) 96%)",
          }}
        />
        <div className="absolute right-4 bottom-5 flex items-center gap-1.5 sm:right-6">
          {slides.map((slide, i) => (
            <span
              key={slide.id}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? "w-5 bg-canvas/80" : "w-1.5 bg-canvas/30"
              }`}
            />
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
