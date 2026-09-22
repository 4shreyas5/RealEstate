"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { PropertyCardData } from "@/lib/properties";

export interface MapProperty extends PropertyCardData {
  latitude: number | null;
  longitude: number | null;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function SearchMap({
  properties,
  selectedId,
  onSelect,
}: {
  properties: MapProperty[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const located = properties.filter(
    (p): p is MapProperty & { latitude: number; longitude: number } =>
      p.latitude !== null && p.longitude !== null,
  );

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: located[0] ? [located[0].longitude, located[0].latitude] : [0, 20],
      zoom: located.length > 0 ? 12 : 2,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("properties", {
        type: "geojson",
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 40,
        data: {
          type: "FeatureCollection",
          features: located.map((p) => ({
            type: "Feature",
            properties: { id: p.id, price: p.priceAmount },
            geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
          })),
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "properties",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1c1b19",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 26],
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "properties",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#faf8f4" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "properties",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#3f6b52",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#faf8f4",
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource("properties") as mapboxgl.GeoJSONSource;
        if (clusterId === undefined) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !zoom) return;
          const geometry = features[0].geometry;
          if (geometry.type !== "Point") return;
          map.easeTo({ center: geometry.coordinates as [number, number], zoom });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) {
          setPreviewId(id);
          onSelect(id);
        }
      });

      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered-point", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered-point", () => (map.getCanvas().style.cursor = ""));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectivePreviewId = previewId ?? selectedId;
  const previewProperty = located.find((p) => p.id === effectivePreviewId);

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center rounded-md bg-canvas-alt p-6 text-center text-sm text-ink-secondary">
        Map unavailable — showing list only.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full rounded-md" />

      {previewProperty && (
        <div className="absolute bottom-4 left-4 right-4 max-w-xs rounded-md border border-border bg-surface p-3 shadow-md sm:right-auto">
          <button
            type="button"
            onClick={() => {
              setPreviewId(null);
              onSelect(null);
            }}
            aria-label="Close preview"
            className="absolute right-2 top-2 text-ink-tertiary hover:text-ink"
          >
            ×
          </button>
          <Link href={`/properties/${previewProperty.slug}`} className="flex gap-3">
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xs bg-canvas-alt">
              {previewProperty.coverImage && (
                <Image
                  src={previewProperty.coverImage.url}
                  alt={previewProperty.coverImage.altText}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tabular-nums text-ink">
                {formatPrice(previewProperty.priceAmount, previewProperty.priceCurrency)}
              </p>
              <p className="truncate text-xs text-ink-secondary">
                {previewProperty.localityName}, {previewProperty.cityName}
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
