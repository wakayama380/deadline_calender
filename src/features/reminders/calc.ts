import { ReminderPolicyInput, TaskInput } from "../../shared/types/task";
import { nowIso } from "../../shared/utils/date";

function normalizeOffsets(values: number[]): number[] {
  return Array.from(new Set(values.map((value) => Math.max(0, Math.round(value))))).sort((a, b) => b - a);
}

function computeOffsets(policy: ReminderPolicyInput): number[] {
  if (!policy.enabled) {
    return [];
  }

  if (policy.customMode && policy.customOffsetsJson) {
    try {
      const parsed = JSON.parse(policy.customOffsetsJson) as number[];
      if (Array.isArray(parsed)) {
        const normalized = normalizeOffsets(parsed);
        if (normalized.length > 0) {
          return normalized;
        }
      }
    } catch {
      // Fall back to evenly distributed offsets.
    }
  }

  const minOffset = policy.includeDueDay ? 0 : 1;
  const maxOffset = Math.max(minOffset, policy.startDaysBefore);
  const count = Math.max(1, policy.remindCount);

  if (count === 1) {
    return [maxOffset];
  }

  const step = (maxOffset - minOffset) / (count - 1);
  const offsets: number[] = [];

  for (let i = 0; i < count; i += 1) {
    offsets.push(maxOffset - i * step);
  }

  return normalizeOffsets(offsets).filter((offset) => offset >= minOffset && offset <= maxOffset);
}

function applyReminderTime(base: Date, remindTime: string): Date {
  const [hoursText, minutesText] = remindTime.split(":");
  const hours = Number.parseInt(hoursText, 10);
  const minutes = Number.parseInt(minutesText, 10);
  const value = new Date(base);
  value.setHours(Number.isNaN(hours) ? 9 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  return value;
}

export function buildReminderSchedule(dueAt: string, policy: ReminderPolicyInput, now = new Date()): string[] {
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime()) || !policy.enabled) {
    return [];
  }

  const offsets = computeOffsets(policy);
  const schedules = offsets.map((offset) => {
    const scheduled = new Date(dueDate);
    scheduled.setDate(scheduled.getDate() - offset);
    return applyReminderTime(scheduled, policy.remindTime);
  });

  const unique = Array.from(new Set(schedules.map((date) => date.toISOString()))).sort();
  return unique.filter((iso) => new Date(iso).getTime() > now.getTime());
}

export function buildReminderMessage(task: TaskInput): string {
  const dueText = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(task.dueAt));

  return `${task.title} の締切は ${dueText} です。`;
}

export function createEventRows(taskId: number, task: TaskInput, policy: ReminderPolicyInput) {
  const createdAt = nowIso();
  return buildReminderSchedule(task.dueAt, policy).map((scheduledAt) => ({
    taskId,
    scheduledAt,
    sentAt: null,
    status: "pending" as const,
    message: buildReminderMessage(task),
    createdAt,
    updatedAt: createdAt
  }));
}
