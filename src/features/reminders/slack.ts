import { invoke, isTauri } from "@tauri-apps/api/core";

const SLACK_WEBHOOK_STORAGE_KEY = "deadline_calender.slack_webhook_url";
const ENV_SLACK_WEBHOOK_URL = (import.meta.env.VITE_SLACK_WEBHOOK_URL ?? "").trim();

export type SlackWebhookSource = "env" | "localStorage" | "none";

function getEnvSlackWebhookUrl(): string {
  return ENV_SLACK_WEBHOOK_URL;
}

function getStoredSlackWebhookUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(SLACK_WEBHOOK_STORAGE_KEY)?.trim() ?? "";
}

export function getSlackWebhookUrl(): string {
  const envWebhookUrl = getEnvSlackWebhookUrl();
  if (envWebhookUrl.length > 0) {
    return envWebhookUrl;
  }

  return getStoredSlackWebhookUrl();
}

export function getSlackWebhookSource(): SlackWebhookSource {
  if (getEnvSlackWebhookUrl().length > 0) {
    return "env";
  }

  if (getStoredSlackWebhookUrl().length > 0) {
    return "localStorage";
  }

  return "none";
}

export function isSlackWebhookConfigured(): boolean {
  return getSlackWebhookSource() !== "none";
}

export function saveSlackWebhookUrl(value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    localStorage.removeItem(SLACK_WEBHOOK_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SLACK_WEBHOOK_STORAGE_KEY, trimmed);
}

export function isValidSlackWebhookUrl(value: string): boolean {
  return /^https:\/\/hooks\.slack\.com\/services\/.+/.test(value.trim());
}

export async function sendSlackMessage(title: string, body: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    return false;
  }

  if (!isValidSlackWebhookUrl(webhookUrl)) {
    throw new Error("Slack webhook URL is invalid.");
  }

  await invoke("send_slack_webhook", {
    webhookUrl,
    text: `*${title}*\n${body}`
  });

  return true;
}
