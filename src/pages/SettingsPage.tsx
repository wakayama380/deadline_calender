import { ChangeEvent, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { BackupPayload } from "../shared/types/task";
import { exportBackup, importBackup } from "../features/tasks/service";

type PermissionStatus = "unknown" | "granted" | "denied" | "unavailable";

export function SettingsPage() {
  const [permission, setPermission] = useState<PermissionStatus>("unknown");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshPermission() {
    if (!isTauri()) {
      setPermission("unavailable");
      return;
    }

    const granted = await isPermissionGranted();
    setPermission(granted ? "granted" : "denied");
  }

  useEffect(() => {
    void refreshPermission();
  }, []);

  async function askPermission() {
    if (!isTauri()) {
      setPermission("unavailable");
      return;
    }

    const value = await requestPermission();
    setPermission(value === "granted" ? "granted" : "denied");
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
    } catch (err) {
      const text = err instanceof Error ? err.message : "Export failed.";
      setMessage(text);
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
      setMessage("Backup imported and reminder events rebuilt.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Import failed.";
      setMessage(text);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

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
