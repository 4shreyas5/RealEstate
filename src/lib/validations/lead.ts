import { z } from "zod";

// Generous but bounded — this is a public, unauthenticated endpoint, so
// every string field gets a hard length cap regardless of how unlikely a
// huge value is in practice.
export const leadSchema = z
  .object({
    propertyId: z.string().max(64).optional(),
    cityId: z.string().max(64).optional(),
    localityId: z.string().max(64).optional(),
    name: z.string().max(200).optional(),
    phone: z.string().max(32).optional(),
    email: z.string().email().max(320).optional().or(z.literal("")),
    message: z.string().max(2000).optional(),
    source: z.string().max(100),
    actionType: z.enum(["WHATSAPP", "CALL", "FORM"]),
    utmSource: z.string().max(200).optional(),
    utmMedium: z.string().max(200).optional(),
    utmCampaign: z.string().max(200).optional(),
  })
  .refine(
    (data) => data.actionType !== "FORM" || (data.name && data.phone),
    { message: "name and phone are required for a form enquiry", path: ["name"] },
  );

export type LeadInput = z.infer<typeof leadSchema>;
