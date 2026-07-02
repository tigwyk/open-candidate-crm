import { z } from "zod";

export const seedOverridesSchema = z.object({
  candidateName: z.string().min(1).optional(),
  officeSought: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  party: z.string().min(1).optional(),
  voteGoal: z.number().int().positive().optional(),
  fundraisingGoalCents: z.number().int().positive().optional(),
});
