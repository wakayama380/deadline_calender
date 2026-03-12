function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

function toHalfWidth(value: string): string {
  return value
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[\uFF1A\uFE55]/g, ":")
    .replace(/[\uFF0F]/g, "/")
    .replace(/[\uFF0E\u3002]/g, ".")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u30FC\uFF70\u2212]/g, "-");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDateTimeLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function splitLocalDateTime(value: string): { date: string; time: string } {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (match) {
    return { date: match[1], time: match[2] };
  }

  return {
    date: "",
    time: "09:00"
  };
}

export function normalizeLocalDateInput(value: string): string | null {
  const text = toHalfWidth(value).trim().replace(/[/.]/g, "-");
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

export function normalizeLocalTimeInput(value: string): string | null {
  const text = toHalfWidth(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${pad(hour)}:${pad(minute)}`;
}

export function joinLocalDateTime(dateValue: string, timeValue: string): string {
  const normalizedDate = normalizeLocalDateInput(dateValue);
  if (!normalizedDate) {
    return "";
  }

  const normalizedTime = normalizeLocalTimeInput(timeValue) ?? "09:00";
  return `${normalizedDate}T${normalizedTime}`;
}

export function fromDateTimeLocalInput(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error("Due At format is invalid.");
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = Number.parseInt(match[6] ?? "0", 10);

  const date = new Date(year, month - 1, day, hour, minute, second, 0);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Due At value is invalid.");
  }

  return date.toISOString();
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
}

export function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isInNextDays(iso: string, days: number): boolean {
  const date = new Date(iso).getTime();
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return date >= now.getTime() && date <= end.getTime();
}

export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
