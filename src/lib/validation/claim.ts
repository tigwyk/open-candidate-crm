import { z } from "zod";

export const claimChannelEnum = z.enum(["call", "canvass"]);

export const claimBodySchema = z.object({
  voterId: z.string().min(1),
  channel: claimChannelEnum,
  volunteerId: z.string().min(1),
});
