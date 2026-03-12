import { ChangeEvent, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { runReminderCheckNow } from "../features/reminders/scheduler";
import {
  getSlackWebhookSource,
  isSlackWebhookConfigured,
  sendSlackMessage,
  type SlackWebhookSource
} from "../features/reminders/slack";
import {
  exportBackup,
  getReminderQueueStatus,
  importBackup,
  type ReminderQueueStatus,
  rebuildMissingReminderEvents
} from "../features/tasks/service";
import { BackupPayload } from "../shared/types/task";
import { formatDateTime } from "../shared/utils/date";
import { getErrorMessage } from "../shared/utils/error";

type PermissionStatus = "unknown" | "granted" | "denied" | "unavailable";

const emptyQueue: ReminderQueueStatus = {
  totalPending: 0,
  duePending: 0,
  nextScheduledAt: null
};

export function SettingsPage() {
  const [permission, setPermission] = useState<PermissionStatus>("unknown");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [slackSource, setSlackSource] = useState<SlackWebhookSource>("none");
  const [queue, setQueue] = useState<ReminderQueueStatus>(emptyQueue);

  async function refreshPermission() {
    if (!isTauri()) {
      setPermission("unavailable");
      return;
    }

    const granted = await isPermissionGranted();
    setPermission(granted ? "granted" : "denied");
  }

  function refreshSlackState() {
    setSlackSource(getSlackWebhookSource());
  }

  async function refreshReminderQueue() {
    const status = await getReminderQueueStatus();
    setQueue(status);
  }

  useEffect(() => {
    refreshSlackState();
    void refreshPermission();
    void refreshReminderQueue();
  }, []);

  async function askPermission() {
    if (!isTauri()) {
      setPermission("unavailable");
      return;
    }

    const value = await requestPermission();
    setPermission(value === "granted" ? "granted" : "denied");
  }

  async function testSlackWebhook() {
    setBusy(true);
    setMessage(null);

    try {
      if (!isSlackWebhookConfigured()) {
        throw new Error("Slack webhook is not configured. Add VITE_SLACK_WEBHOOK_URL to .env and restart the app.");
      }

      const sent = await sendSlackMessage(
        "Deadline Calender test",
        "This is a test notification from your local app settings."
      );

      if (!sent) {
        throw new Error("Slack message was not sent. Check runtime and webhook settings.");
      }

      setMessage("Slack test message sent.");
      refreshSlackState();
    } catch (error) {
      setMessage(getErrorMessage(error, "Slack test failed."));
    } finally {
      setBusy(false);
    }
  }

  async function runReminderNow() {
    setBusy(true);
    setMessage(null);

    try {
      const rebuilt = await rebuildMissingReminderEvents();
      const result = await runReminderCheckNow();
      await refreshReminderQueue();
      setMessage(
        `Reminder check finished. rebuilt=${rebuilt}, processed=${result.processed}, sent=${result.sent}, unsent=${result.unsent}`
      );
    } catch (error) {
      setMessage(getErrorMessage(error, "Reminder check failed."));
    } finally {
      setBusy(false);
    }
  }

  async function downloadBackup() {
    setBusy(true);
    setMessage(null);
    try {
      const payload = await exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deadline-backup-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Backup exported.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Export failed."));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text) as BackupPayload;
      if (json.version !== 1 || !Array.isArray(json.tasks) || !Array.isArray(json.policies)) {
        throw new Error("Invalid backup format.");
      }

      await importBackup(json);
      await refreshReminderQueue();
      setMessage("Backup imported and reminder events rebuilt.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Import failed."));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  const slackStatusLabel =
    slackSource === "env"
      ? ".env (VITE_SLACK_WEBHOOK_URL)"
      : slackSource === "localStorage"
      ? "local storage (legacy)"
      : "not configured";

  const nextReminderText = queue.nextScheduledAt ? formatDateTime(queue.nextScheduledAt) : "none";

  return (
    <section>
      <div className="page-head">
        <h2>Settings</h2>
      </div>

      <div className="panel">
        <h3>Notification Permission</h3>
        <p>
          Current status: <strong>{permission}</strong>
        </p>
        <div className="inline-actions">
          <button onClick={() => void refreshPermission()} disabled={busy}>
            Refresh
          </button>
          <button onClick={() => void askPermission()} disabled={busy || permission === "unavailable"}>
            Request Permission
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Slack Integration</h3>
        <p>
          Webhook status: <strong>{slackStatusLabel}</strong>
        </p>
        <p className="muted">Webhook URL is intentionally hidden to avoid accidental leaks.</p>
        <div className="inline-actions">
          <button
            onClick={() => {
              refreshSlackState();
              setMessage(null);
            }}
            disabled={busy}
          >
            Refresh Slack Status
          </button>
          <button onClick={() => void testSlackWebhook()} disabled={busy || slackSource === "none"}>
            Send Test
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Reminder Runtime</h3>
        <p>
          Pending: <strong>{queue.totalPending}</strong> / Due now: <strong>{queue.duePending}</strong>
        </p>
        <p>
          Next reminder: <strong>{nextReminderText}</strong>
        </p>
        <div className="inline-actions">
          <button
            onClick={() => {
              void refreshReminderQueue();
              setMessage(null);
            }}
            disabled={busy}
          >
            Refresh Queue
          </button>
          <button onClick={() => void runReminderNow()} disabled={busy}>
            Run Reminder Check Now
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Backup</h3>
        <div className="inline-actions">
          <button onClick={() => void downloadBackup()} disabled={busy}>
            Export JSON
          </button>
          <label className="file-label">
            Import JSON
            <input type="file" accept="application/json" onChange={(event) => void handleImport(event)} disabled={busy} />
          </label>
        </div>
      </div>

      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}
