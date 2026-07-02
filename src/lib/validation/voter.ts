import { z } from "zod";
import { supportLevelEnum } from "./shared";

export const voterPatchSchema = z.object({
  id: z.string().min(1),
  supportLevel: supportLevelEnum.optional(),
  notes: z.string().nullable().optional(),
  volunteer: z.boolean().optional(),
  hasYardSign: z.boolean().optional(),
  hasBumperSticker: z.boolean().optional(),
  tags: z.string().nullable().optional(),
});
