"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function PropertyLocationMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [longitude, latitude],
      zoom: 14,
      interactive: true,
      attributionControl: false,
    });
    new mapboxgl.Marker({ color: "#3f6b52" }).setLngLat([longitude, latitude]).addTo(map);
    return () => map.remove();
  }, [latitude, longitude]);

  if (!TOKEN) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md bg-canvas-alt text-sm text-ink-secondary">
        Map unavailable.
      </div>
    );
  }

  return <div ref={containerRef} className="h-64 w-full rounded-md sm:h-80" />;
}
