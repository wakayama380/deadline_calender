import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string().max(2000, "Description is too long"),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Due date is required"),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["todo", "doing", "done"]),
  enabled: z.boolean(),
  startDaysBefore: z.number().int().min(0).max(365),
  remindCount: z.number().int().min(1).max(30),
  remindTime: z.string().regex(/^\d{2}:\d{2}$/),
  includeDueDay: z.boolean(),
  customMode: z.boolean(),
  customOffsetsJson: z.string().nullable()
});

export type TaskFormValues = z.infer<typeof taskSchema>;