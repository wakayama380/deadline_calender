import { formatDateTime } from "../../shared/utils/date";
import { listDueReminderEvents, markReminderSent } from "../tasks/service";
import { sendTaskNotification } from "./notification";

let timer: ReturnType<typeof setInterval> | null = null;
let ticking = false;

async function tick(): Promise<void> {
  if (ticking) {
    return;
  }

  ticking = true;
  try {
    const dueEvents = await listDueReminderEvents(50);
    for (const event of dueEvents) {
      const sent = await sendTaskNotification(
        `締切リマインド: ${event.title}`,
        `${event.message}\n締切: ${formatDateTime(event.dueAt)}`
      );

      if (sent) {
        await markReminderSent(event.eventId);
      }
    }
  } finally {
    ticking = false;
  }
}

export function startReminderScheduler(): () => void {
  if (timer) {
    return stopReminderScheduler;
  }

  void tick();
  timer = setInterval(() => {
    void tick();
  }, 60_000);

  return stopReminderScheduler;
}

export function stopReminderScheduler(): void {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;
}
