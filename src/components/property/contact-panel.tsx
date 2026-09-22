import { formatPrice } from "@/lib/format";
import { WhatsAppCTA, CallCTA, EnquiryCTA, type ContactContext } from "@/components/shared/contact-actions";

export function ContactPanel({
  priceAmount,
  priceCurrency,
  context,
}: {
  priceAmount: number;
  priceCurrency: string;
  context: ContactContext;
}) {
  return (
    <>
      {/* Desktop sticky right rail */}
      <div className="hidden lg:sticky lg:top-20 lg:block lg:rounded-md lg:border lg:border-border lg:bg-surface lg:p-5">
        <p className="text-sm text-ink-secondary">Interested in this home?</p>
        <p className="mt-1 font-sans text-xl font-semibold tabular-nums text-ink">
          {formatPrice(priceAmount, priceCurrency)}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <WhatsAppCTA context={context} className="w-full" />
          <CallCTA context={context} className="w-full" />
          <EnquiryCTA context={context} className="w-full" />
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-border bg-surface px-4 py-3 shadow-md lg:hidden">
        <p className="shrink-0 font-sans text-sm font-semibold tabular-nums text-ink">
          {formatPrice(priceAmount, priceCurrency)}
        </p>
        <div className="flex gap-2">
          <WhatsAppCTA context={context} className="px-4 py-2.5" />
          <CallCTA context={context} className="px-3 py-2.5" />
          <EnquiryCTA context={context} className="px-3 py-2.5" />
        </div>
      </div>
    </>
  );
}
