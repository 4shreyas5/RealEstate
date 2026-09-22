import type { Metadata } from "next";
import { EnquiryForm } from "@/components/shared/enquiry-form";
import { WhatsAppCTA, CallCTA } from "@/components/shared/contact-actions";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  const context = { source: "contact_page" } as const;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 sm:px-6">
      <h1 className="font-display text-3xl font-medium text-ink">Talk to our team</h1>
      <p className="mt-3 text-ink-secondary">
        Tell us what you&apos;re looking for and we&apos;ll get back to you —
        or reach us directly.
      </p>

      <div className="mt-6 flex gap-3">
        <WhatsAppCTA context={context} />
        <CallCTA context={context} />
      </div>

      <div className="mt-10 border-t border-border pt-10">
        <EnquiryForm context={context} />
      </div>
    </div>
  );
}
