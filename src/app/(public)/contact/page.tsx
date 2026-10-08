import type { Metadata } from "next";
import { EnquiryForm } from "@/components/shared/enquiry-form";
import { WhatsAppCTA, CallCTA } from "@/components/shared/contact-actions";
import { getT } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Contact us",
  alternates: {
    canonical: "/contact",
    languages: { en: "/contact?hl=en", hi: "/contact?hl=hi", "x-default": "/contact?hl=en" },
  },
};

export default async function ContactPage() {
  const { t } = await getT();
  const context = { source: "contact_page" } as const;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 sm:px-6">
      <h1 className="font-display text-3xl font-medium text-ink">{t("contact.talkToOurTeam")}</h1>
      <p className="mt-3 text-ink-secondary">{t("contact.contactPageIntro")}</p>

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
