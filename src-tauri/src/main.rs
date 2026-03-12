#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;

#[derive(Serialize)]
struct SlackPayload {
  text: String,
}

#[tauri::command]
async fn send_slack_webhook(webhook_url: String, text: String) -> Result<(), String> {
  let client = reqwest::Client::new();
  let payload = SlackPayload { text };

  let response = client
    .post(webhook_url)
    .json(&payload)
    .send()
    .await
    .map_err(|error| format!("failed to send Slack webhook: {error}"))?;

  if response.status().is_success() {
    Ok(())
  } else {
    Err(format!("slack webhook returned status {}", response.status()))
  }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![send_slack_webhook])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}