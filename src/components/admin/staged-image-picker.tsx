"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ALLOWED_IMAGE_TYPES, MAX_PROPERTY_IMAGE_BYTES } from "@/lib/storage";

/** A photo picked before the property exists — held entirely in the browser
 * (an in-memory File + an object URL for the preview) until the property is
 * created and this can actually be uploaded to Storage. */
export interface StagedImage {
  key: string;
  file: File;
  previewUrl: string;
  altText: string;
  roomLabel: string;
  isCover: boolean;
}

const ACCEPT_LABEL = "JPG, PNG, WebP or AVIF — up to " + MAX_PROPERTY_IMAGE_BYTES / 1024 / 1024 + " MB each";

export function StagedImagePicker({
  images,
  onChange,
}: {
  images: StagedImage[];
  onChange: (next: StagedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted: StagedImage[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: use a JPG, PNG, WebP or AVIF image.`);
        continue;
      }
      if (file.size > MAX_PROPERTY_IMAGE_BYTES) {
        errors.push(`${file.name}: larger than ${MAX_PROPERTY_IMAGE_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        altText: "",
        roomLabel: "",
        isCover: images.length === 0 && accepted.length === 0,
      });
    }

    setError(errors.length > 0 ? errors.join(" ") : null);
    if (accepted.length > 0) onChange([...images, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(key: string) {
    const target = images.find((i) => i.key === key);
    const next = images.filter((i) => i.key !== key);
    if (target?.isCover && next.length > 0 && !next.some((i) => i.isCover)) {
      next[0] = { ...next[0], isCover: true };
    }
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(next);
  }

  function move(key: string, direction: "up" | "down") {
    const index = images.findIndex((i) => i.key === key);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= images.length) return;
    const next = [...images];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onChange(next);
  }

  function makeCover(key: string) {
    onChange(images.map((i) => ({ ...i, isCover: i.key === key })));
  }

  function updateField(key: string, field: "altText" | "roomLabel", value: string) {
    onChange(images.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  }

  return (
    <div>
      <label
        htmlFor="staged-image-upload"
        className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-canvas-alt px-6 py-10 text-center text-sm text-ink-secondary hover:border-accent"
      >
        <span>Click to select photos, or drag them here</span>
        <span className="mt-1 text-xs text-ink-tertiary">{ACCEPT_LABEL}</span>
        <input
          id="staged-image-upload"
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.key} className="rounded-sm border border-border bg-surface p-2">
              <div className="relative aspect-4/3 overflow-hidden rounded-xs bg-canvas-alt">
                <Image src={image.previewUrl} alt="" fill sizes="200px" unoptimized className="object-cover" />
                {image.isCover && (
                  <span className="absolute left-1 top-1 rounded-xs bg-accent px-1.5 py-0.5 text-[10px] font-medium text-canvas">
                    Cover
                  </span>
                )}
              </div>

              <input
                type="text"
                placeholder="Room (e.g. Living room)"
                value={image.roomLabel}
                onChange={(e) => updateField(image.key, "roomLabel", e.target.value)}
                className="mt-2 w-full rounded-xs border border-border px-2 py-1 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <input
                type="text"
                placeholder="Alt text"
                value={image.altText}
                onChange={(e) => updateField(image.key, "altText", e.target.value)}
                className="mt-1 w-full rounded-xs border border-border px-2 py-1 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />

              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-secondary">
                <div className="flex gap-2">
                  <button type="button" disabled={index === 0} onClick={() => move(image.key, "up")}>
                    ↑
                  </button>
                  <button type="button" disabled={index === images.length - 1} onClick={() => move(image.key, "down")}>
                    ↓
                  </button>
                  {!image.isCover && (
                    <button type="button" onClick={() => makeCover(image.key)}>
                      Make cover
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => remove(image.key)} className="text-error">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
