import { z } from "zod";

export const transferPlatformOwnerSchema = z.object({
  email: z.string().email(),
});
