import { z } from "zod";

export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export const taskStatusEnum = z.enum(["todo", "in-progress", "done", "blocked"]);

export const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().nullable().optional(),
  campaignId: z.string().min(1),
  assignedVolunteerId: z.string().nullable().optional(),
});

export const taskPatchSchema = z.object({
  id: z.string().min(1),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assignedVolunteerId: z.string().nullable().optional(),
});
