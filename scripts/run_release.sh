#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BIN_PATH="${APP_ROOT}/src-tauri/target/release/deadline_calender"

if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  echo "GUI session is not available (DISPLAY/WAYLAND_DISPLAY is empty)."
  echo "Run this from a WSLg-enabled Ubuntu desktop session or launch from the app menu."
  exit 1
fi

if [[ ! -x "${BIN_PATH}" ]]; then
  echo "Release binary not found. Building first..."
  (cd "${APP_ROOT}" && npm run tauri:build)
fi

if grep -qi microsoft /proc/version 2>/dev/null; then
  export GDK_BACKEND="${GDK_BACKEND:-x11}"
  export WEBKIT_DISABLE_COMPOSITING_MODE="${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"
  export LIBGL_ALWAYS_SOFTWARE="${LIBGL_ALWAYS_SOFTWARE:-1}"
  export GSK_RENDERER="${GSK_RENDERER:-cairo}"
fi

exec "${BIN_PATH}"
