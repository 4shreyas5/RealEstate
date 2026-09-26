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
import {
  ALLOWED_IMAGE_TYPES,
  MAX_PROPERTY_IMAGE_BYTES,
  PROPERTY_IMAGE_BUCKET,
  buildPropertyImagePath,
  isSupabaseStorageUrl,
} from "@/lib/storage";

export interface PropertyImageRow {
  id: string;
  url: string;
  altText: string;
  roomLabel: string | null;
  isCover: boolean;
  position: number;
}

const STORAGE_HINT =
  "Storage bucket 'property-images' is missing or its upload policy isn't set up — see README (Storage setup).";

export function ImageManager({
  propertyId,
  images,
}: {
  propertyId: string;
  images: PropertyImageRow[];
}) {
  const [rows, setRows] = useState(images);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadErrors([]);
    const errors: string[] = [];
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: use a JPG, PNG, WebP or AVIF image.`);
        continue;
      }
      if (file.size > MAX_PROPERTY_IMAGE_BYTES) {
        errors.push(`${file.name}: larger than ${MAX_PROPERTY_IMAGE_BYTES / 1024 / 1024} MB.`);
        continue;
      }

      const path = buildPropertyImagePath(propertyId, file);
      const { error } = await supabase.storage
        .from(PROPERTY_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) {
        errors.push(`${file.name}: upload failed (${error.message}). ${STORAGE_HINT}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(PROPERTY_IMAGE_BUCKET).getPublicUrl(path);

      try {
        const image = await addPropertyImage(propertyId, publicUrl);
        setRows((prev) => [...prev, image]);
      } catch {
        await supabase.storage.from(PROPERTY_IMAGE_BUCKET).remove([path]);
        errors.push(`${file.name}: uploaded but couldn't be saved to the property.`);
      }
    }

    setUploadErrors(errors);
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
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {uploadErrors.length > 0 && (
        <ul role="alert" className="mt-3 rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
          {uploadErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((image, index) => (
            <li key={image.id} className="rounded-sm border border-border bg-surface p-2">
              <div className="relative aspect-4/3 overflow-hidden rounded-xs bg-canvas-alt">
                {/* Placeholder (non-Storage) photos can't go through the optimizer in
                    production — render them directly so they can still be seen and removed. */}
                <Image
                  src={image.url}
                  alt={image.altText}
                  fill
                  sizes="200px"
                  unoptimized={!isSupabaseStorageUrl(image.url)}
                  className="object-cover"
                />
                {!isSupabaseStorageUrl(image.url) && (
                  <span className="absolute bottom-1 left-1 rounded-xs bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-canvas">
                    Placeholder — replace
                  </span>
                )}
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
