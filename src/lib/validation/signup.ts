import { z } from "zod";

export const passwordSchema = z.string().min(12);

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: passwordSchema,
  candidateName: z.string().min(1),
  officeSought: z.string().min(1),
  district: z.string().min(1),
  party: z.string().min(1).optional(),
  electionDate: z.string().min(1),
  voteGoal: z.number().int().positive().optional(),
  fundraisingGoalCents: z.number().int().positive().optional(),
});
