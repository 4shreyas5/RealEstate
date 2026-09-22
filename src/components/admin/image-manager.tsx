"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addPropertyImage,
  moveImage,
  removePropertyImage,
  setCoverImage,
  updateImageAltText,
  updateImageRoomLabel,
} from "@/app/admin/(dashboard)/properties/image-actions";

export interface PropertyImageRow {
  id: string;
  url: string;
  altText: string;
  roomLabel: string | null;
  isCover: boolean;
  position: number;
}

const BUCKET = "property-images";

export function ImageManager({
  propertyId,
  images,
}: {
  propertyId: string;
  images: PropertyImageRow[];
}) {
  const [rows, setRows] = useState(images);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const path = `${propertyId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (error) continue;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const image = await addPropertyImage(propertyId, publicUrl);
      setRows((prev) => [...prev, image]);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(imageId: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveImage(propertyId, imageId, direction);
      setRows((prev) => {
        const index = prev.findIndex((r) => r.id === imageId);
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[swapWith]] = [next[swapWith], next[index]];
        return next;
      });
    });
  }

  return (
    <div>
      <label
        htmlFor="image-upload"
        className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border-strong bg-canvas-alt px-6 py-10 text-sm text-ink-secondary hover:border-accent"
      >
        {uploading ? "Uploading…" : "Click to upload photos, or drag them here"}
        <input
          id="image-upload"
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((image, index) => (
            <li key={image.id} className="rounded-sm border border-border bg-surface p-2">
              <div className="relative aspect-4/3 overflow-hidden rounded-xs bg-canvas-alt">
                <Image src={image.url} alt={image.altText} fill sizes="200px" className="object-cover" />
                {image.isCover && (
                  <span className="absolute left-1 top-1 rounded-xs bg-accent px-1.5 py-0.5 text-[10px] font-medium text-canvas">
                    Cover
                  </span>
                )}
              </div>

              <input
                type="text"
                placeholder="Room (e.g. Living room)"
                defaultValue={image.roomLabel ?? ""}
                onBlur={(e) => updateImageRoomLabel(image.id, e.target.value)}
                className="mt-2 w-full rounded-xs border border-border px-2 py-1 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <input
                type="text"
                placeholder="Alt text (required)"
                defaultValue={image.altText}
                onBlur={(e) => updateImageAltText(image.id, e.target.value)}
                className="mt-1 w-full rounded-xs border border-border px-2 py-1 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />

              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-secondary">
                <div className="flex gap-2">
                  <button type="button" disabled={index === 0 || isPending} onClick={() => move(image.id, "up")}>
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === rows.length - 1 || isPending}
                    onClick={() => move(image.id, "down")}
                  >
                    ↓
                  </button>
                  {!image.isCover && (
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await setCoverImage(propertyId, image.id);
                          setRows((prev) =>
                            prev.map((r) => ({ ...r, isCover: r.id === image.id })),
                          );
                        })
                      }
                    >
                      Make cover
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await removePropertyImage(propertyId, image.id);
                      setRows((prev) => prev.filter((r) => r.id !== image.id));
                    })
                  }
                  className="text-error"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
