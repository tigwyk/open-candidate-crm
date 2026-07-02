import { z } from "zod";
import { supportLevelEnum } from "./shared";

export const callOutcomeEnum = z.enum([
  "contacted",
  "no-answer",
  "voicemail",
  "wrong-number",
  "refused",
  "call-back",
]);

export const callCreateSchema = z.object({
  voterId: z.string().min(1).optional(),
  volunteerId: z.string().min(1).optional(),
  campaignId: z.string().min(1),
  outcome: callOutcomeEnum.optional(),
  supportLevel: supportLevelEnum.optional(),
  issuePriority: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  callLengthSec: z.number().int().min(0).optional(),
});
