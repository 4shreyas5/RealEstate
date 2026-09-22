"use client";

import { useState } from "react";
import { getUtmFromLocation } from "@/lib/utm";

export interface EnquiryContext {
  propertyId?: string;
  cityId?: string;
  localityId?: string;
  title?: string;
  locality?: string;
  source: string;
}

const input =
  "mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
const label = "text-xs font-medium text-ink";

export function EnquiryForm({
  context,
  onSuccess,
}: {
  context: EnquiryContext;
  onSuccess?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState(
    context.title ? `I'm interested in ${context.title}${context.locality ? ` in ${context.locality}` : ""}.` : "",
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: context.propertyId,
        cityId: context.cityId,
        localityId: context.localityId,
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        message: form.get("message"),
        source: context.source,
        actionType: "FORM",
        ...getUtmFromLocation(),
      }),
    });

    if (res.ok) {
      setStatus("success");
      onSuccess?.();
    } else {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
        Thanks — our team will reach out shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={label} htmlFor="enquiry-name">
          Name
        </label>
        <input id="enquiry-name" name="name" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="enquiry-phone">
          Phone
        </label>
        <input id="enquiry-phone" name="phone" type="tel" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="enquiry-email">
          Email (optional)
        </label>
        <input id="enquiry-email" name="email" type="email" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="enquiry-message">
          Message
        </label>
        <textarea
          id="enquiry-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${input} min-h-24`}
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-error">Something went wrong — please try again.</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-sm bg-accent px-4 py-3 text-sm font-medium text-canvas hover:bg-accent-hover disabled:opacity-40"
      >
        {status === "submitting" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
