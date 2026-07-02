import { z } from "zod";
import { supportLevelEnum } from "./shared";

export const canvassOutcomeEnum = z.enum([
  "canvassed",
  "not-home",
  "refused",
  "wrong-address",
  "language-barrier",
]);

export const canvassCreateSchema = z.object({
  voterId: z.string().min(1).optional(),
  householdId: z.string().min(1).optional(),
  volunteerId: z.string().min(1).optional(),
  campaignId: z.string().min(1),
  outcome: canvassOutcomeEnum.optional(),
  supportLevel: supportLevelEnum.optional(),
  yardSign: z.boolean().optional(),
  issuePriority: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
