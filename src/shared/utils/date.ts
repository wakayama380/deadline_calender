export function nowIso(): string {
  return new Date().toISOString();
}

export function toDateTimeLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => `${value}`.padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function fromDateTimeLocalInput(value: string): string {
  return new Date(value).toISOString();
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
