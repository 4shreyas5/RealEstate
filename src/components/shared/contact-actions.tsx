"use client";

import { useRef } from "react";
import { LinkButton } from "@/components/ui/button";
import { EnquiryForm, type EnquiryContext } from "./enquiry-form";
import { getUtmFromLocation } from "@/lib/utm";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

export interface ContactContext {
  propertyId?: string;
  cityId?: string;
  localityId?: string;
  title?: string;
  locality?: string;
  url?: string;
  source: string;
}

function buildWhatsAppMessage(context?: ContactContext) {
  if (!context?.title) {
    return "Hi, I'd like to know more about properties on DreamIT.";
  }
  const location = context.locality ? ` in ${context.locality}` : "";
  const link = context.url ? ` (${context.url})` : "";
  return `Hi, I'm interested in ${context.title}${location}${link}.`;
}

/** Fire-and-forget lead event for a WhatsApp/Call click — never blocks navigation. */
function trackAction(actionType: "WHATSAPP" | "CALL", context?: ContactContext) {
  if (!context) return;
  fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      propertyId: context.propertyId,
      cityId: context.cityId,
      localityId: context.localityId,
      source: context.source,
      actionType,
      ...getUtmFromLocation(),
    }),
  }).catch(() => {});
}

/**
 * The WhatsApp mark identifies the channel; the button itself stays on the
 * platform's Moss accent — WhatsApp green is never introduced as a second
 * brand color.
 */
export function WhatsAppCTA({ context, className }: { context?: ContactContext; className?: string }) {
  if (!WHATSAPP_NUMBER) {
    return <DisabledCTA className={className}><WhatsAppIcon />WhatsApp</DisabledCTA>;
  }

  const message = buildWhatsAppMessage(context);
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <LinkButton
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackAction("WHATSAPP", context)}
    >
      <WhatsAppIcon />
      WhatsApp
    </LinkButton>
  );
}

export function CallCTA({ context, className }: { context?: ContactContext; className?: string }) {
  if (!CONTACT_PHONE) {
    return <DisabledCTA className={className}><PhoneIcon />Call</DisabledCTA>;
  }

  return (
    <LinkButton
      href={`tel:${CONTACT_PHONE}`}
      variant="ghost"
      className={className}
      onClick={() => trackAction("CALL", context)}
    >
      <PhoneIcon />
      Call
    </LinkButton>
  );
}

/** Renders when a contact channel's number isn't configured — visibly inert rather than a broken/misleading link. */
function DisabledCTA({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      aria-disabled="true"
      title="Not configured"
      className={`inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-sm border border-border px-6 py-3 text-sm font-medium text-ink-tertiary ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function EnquiryCTA({ context, className }: { context: ContactContext; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const enquiryContext: EnquiryContext = context;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={`inline-flex items-center justify-center gap-2 rounded-sm border border-border-strong px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${className ?? ""}`}
      >
        Enquire
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-0 backdrop:bg-ink/40 [&:not([open])]:hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-medium text-ink">
            {context.title ? `Ask about ${context.title}` : "Send an enquiry"}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="text-ink-secondary"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5">
          <EnquiryForm context={enquiryContext} onSuccess={() => setTimeout(() => dialogRef.current?.close(), 1500)} />
        </div>
      </dialog>
    </>
  );
}

/** The three conversion actions, always together, always in this order. */
export function ContactActionsRow({ context, className }: { context?: ContactContext; className?: string }) {
  const resolvedContext: ContactContext = context ?? { source: "unspecified" };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
      <WhatsAppCTA context={resolvedContext} />
      <CallCTA context={resolvedContext} />
      <EnquiryCTA context={resolvedContext} />
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5a6.5 6.5 0 0 0-5.6 9.8L1.5 14.5l3.3-.87A6.5 6.5 0 1 0 8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M5.7 5.4c.1-.3.3-.3.5-.3h.4c.1 0 .3 0 .4.3.2.4.6 1.3.6 1.4.1.1.1.3 0 .4-.1.2-.1.2-.3.4-.1.2-.3.3-.1.6.2.3.7 1.1 1.5 1.5.5.3.6.2.8 0 .1-.1.5-.6.6-.8.1-.2.3-.1.4-.1.2.1 1.2.6 1.4.7.2.1.3.1.4.2 0 .2 0 .8-.3 1.1-.2.4-1 .7-1.4.7-.4 0-.9 0-2.7-1.1-1.5-1-2.4-2.5-2.5-2.7-.1-.2-.7-1-.7-1.9 0-.9.5-1.4.7-1.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 2.5h2l1 3-1.5 1a8 8 0 0 0 4 4l1-1.5 3 1v2c0 .8-.7 1.5-1.5 1.4-5.2-.4-9.4-4.6-9.8-9.8-.1-.8.6-1.5 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
