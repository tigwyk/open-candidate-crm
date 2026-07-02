import { z } from "zod";

export const donationMethodEnum = z.enum(["online", "check", "cash", "in-kind"]);

export const donationCreateSchema = z.object({
  amountCents: z.number().int().positive(),
  donorId: z.string().min(1),
  campaignId: z.string().min(1),
  method: donationMethodEnum.optional(),
  donationDate: z.string().min(1).optional(),
  inKindDescription: z.string().nullable().optional(),
  complianceVerified: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});
