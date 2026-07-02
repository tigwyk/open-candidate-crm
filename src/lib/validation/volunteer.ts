import { z } from "zod";

export const volunteerRoleEnum = z.enum([
  "coordinator",
  "canvasser",
  "phone-banker",
  "designer",
  "data",
  "general",
]);

export const volunteerStatusEnum = z.enum(["active", "inactive", "lead"]);

export const volunteerPatchSchema = z.object({
  id: z.string().min(1),
  status: volunteerStatusEnum.optional(),
  role: volunteerRoleEnum.optional(),
  hoursLogged: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
});
