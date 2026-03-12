import { ReminderPolicyInput, TaskInput } from "../../shared/types/task";
import { nowIso, formatDateTime } from "../../shared/utils/date";

const REMINDER_PHRASE_START = "\u306e\u7DE0\u5207\u306F";
const REMINDER_PHRASE_END = "\u3067\u3059\u3002";

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

function ceilToNextMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);
  return next;
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
  const future = unique.filter((iso) => new Date(iso).getTime() > now.getTime());

  if (future.length > 0) {
    return future;
  }

  if (dueDate.getTime() > now.getTime()) {
    return [ceilToNextMinute(now).toISOString()];
  }

  return [];
}

export function buildReminderMessageText(title: string, dueAt: string): string {
  const dueText = formatDateTime(dueAt);
  return `${title} ${REMINDER_PHRASE_START} ${dueText} ${REMINDER_PHRASE_END}`;
}

export function buildReminderMessage(task: TaskInput): string {
  return buildReminderMessageText(task.title, task.dueAt);
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
