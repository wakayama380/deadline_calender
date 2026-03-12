import { listDueReminderEvents, markReminderSent } from "../tasks/service";
import { sendTaskNotification } from "./notification";
import { sendSlackMessage } from "./slack";
import { buildReminderMessageText } from "./calc";

let timer: ReturnType<typeof setInterval> | null = null;
let ticking = false;

export interface ReminderRunResult {
  processed: number;
  sent: number;
  unsent: number;
}

async function runTick(): Promise<ReminderRunResult> {
  if (ticking) {
    return { processed: 0, sent: 0, unsent: 0 };
  }

  ticking = true;
  try {
    const dueEvents = await listDueReminderEvents(50);
    const result: ReminderRunResult = {
      processed: dueEvents.length,
      sent: 0,
      unsent: 0
    };

    for (const event of dueEvents) {
      const title = `Deadline reminder: ${event.title}`;
      const body = buildReminderMessageText(event.title, event.dueAt);

      const desktopSent = await sendTaskNotification(title, body);

      let slackSent = false;
      try {
        slackSent = await sendSlackMessage(title, body);
      } catch (error) {
        console.error("failed to send slack message", error);
      }

      if (desktopSent || slackSent) {
        await markReminderSent(event.eventId);
        result.sent += 1;
      } else {
        result.unsent += 1;
      }
    }

    return result;
  } finally {
    ticking = false;
  }
}

export async function runReminderCheckNow(): Promise<ReminderRunResult> {
  return runTick();
}

export function startReminderScheduler(): () => void {
  if (timer) {
    return stopReminderScheduler;
  }

  void runTick();
  timer = setInterval(() => {
    void runTick();
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
