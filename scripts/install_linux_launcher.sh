#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BIN_PATH="${APP_ROOT}/src-tauri/target/release/deadline_calender"
ICON_PATH="${APP_ROOT}/src-tauri/icons/icon.png"

if [[ ! -x "${BIN_PATH}" ]]; then
  echo "Release binary not found: ${BIN_PATH}"
  echo "Run: npm run tauri:build"
  exit 1
fi

mkdir -p "${HOME}/.local/share/applications"
mkdir -p "${HOME}/.config/autostart"

DESKTOP_FILE="${HOME}/.local/share/applications/deadline-calender.desktop"
AUTOSTART_FILE="${HOME}/.config/autostart/deadline-calender.desktop"

cat > "${DESKTOP_FILE}" <<DESKTOP
[Desktop Entry]
Type=Application
Version=1.0
Name=Deadline Calender
Comment=Local-first task and reminder manager
Exec=${BIN_PATH}
Icon=${ICON_PATH}
Terminal=false
Categories=Office;Utility;
StartupNotify=true
DESKTOP

cat > "${AUTOSTART_FILE}" <<DESKTOP
[Desktop Entry]
Type=Application
Version=1.0
Name=Deadline Calender
Comment=Start Deadline Calender on login
Exec=${BIN_PATH}
Icon=${ICON_PATH}
Terminal=false
X-GNOME-Autostart-enabled=true
NoDisplay=false
DESKTOP

chmod +x "${DESKTOP_FILE}" "${AUTOSTART_FILE}"

echo "Installed desktop launcher: ${DESKTOP_FILE}"
echo "Installed autostart entry: ${AUTOSTART_FILE}"
echo "You can now launch 'Deadline Calender' from the app menu."
