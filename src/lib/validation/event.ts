import { z } from "zod";

export const eventTypeEnum = z.enum([
  "campaign",
  "town-hall",
  "canvass-kickoff",
  "phone-bank",
  "fundraiser",
  "rally",
  "volunteer-meeting",
]);

export const eventStatusEnum = z.enum(["scheduled", "completed", "cancelled"]);

export const eventCreateSchema = z.object({
  title: z.string().min(1),
  type: eventTypeEnum.optional(),
  startTime: z.string().min(1),
  endTime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  campaignId: z.string().min(1),
});

export const eventPatchSchema = z.object({
  id: z.string().min(1),
  status: eventStatusEnum,
});
