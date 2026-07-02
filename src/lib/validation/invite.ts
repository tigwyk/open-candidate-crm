import { z } from "zod";
import { passwordSchema } from "./signup";

export const createInviteSchema = z.object({
  campaignId: z.string().min(1),
  email: z.string().email(),
});

export const acceptInviteNewUserSchema = z.object({
  name: z.string().min(1),
  password: passwordSchema,
});
