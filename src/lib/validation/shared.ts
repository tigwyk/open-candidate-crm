import { z } from "zod";

export const supportLevelEnum = z.enum([
  "strong-support",
  "lean-support",
  "undecided",
  "lean-oppose",
  "strong-oppose",
  "unknown",
]);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
