import { isTauri } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from "@tauri-apps/plugin-notification";

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  return permissionGranted;
}

export async function sendTaskNotification(title: string, body: string): Promise<boolean> {
  const allowed = await ensureNotificationPermission();
  if (!allowed) {
    return false;
  }

  await sendNotification({ title, body });
  return true;
}
