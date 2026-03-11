export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "doing" | "done";
export type ReminderEventStatus = "pending" | "sent" | "skipped";

export interface Task {
  id: number;
  title: string;
  description: string;
  dueAt: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderPolicy {
  id: number;
  taskId: number;
  enabled: boolean;
  startDaysBefore: number;
  remindCount: number;
  remindTime: string;
  includeDueDay: boolean;
  customMode: boolean;
  customOffsetsJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderEvent {
  id: number;
  taskId: number;
  scheduledAt: string;
  sentAt: string | null;
  status: ReminderEventStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithPolicy extends Task {
  policy: ReminderPolicy;
}

export interface DashboardSummary {
  dueToday: number;
  dueThisWeek: number;
  overdue: number;
  remindersToday: number;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  tasks: Task[];
  policies: ReminderPolicy[];
}

export interface TaskInput {
  title: string;
  description: string;
  dueAt: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface ReminderPolicyInput {
  enabled: boolean;
  startDaysBefore: number;
  remindCount: number;
  remindTime: string;
  includeDueDay: boolean;
  customMode: boolean;
  customOffsetsJson: string | null;
}
