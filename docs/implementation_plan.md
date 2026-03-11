# Implementation Notes

This project follows `Agent_plan.md` and ships an MVP with:

- React + TypeScript + Vite UI
- Tauri v2 desktop runtime
- SQLite storage via `@tauri-apps/plugin-sql`
- Notification scheduler via `@tauri-apps/plugin-notification`
- Task CRUD, reminder policy, reminder event generation
- Dashboard counters (today / week / overdue / reminders today)
- JSON backup export/import with event rebuild on import

## Core modules

- `src/shared/db/sqlite.ts`: schema creation and DB helpers
- `src/features/tasks/service.ts`: CRUD, dashboard, backup, due-event queries
- `src/features/reminders/calc.ts`: reminder schedule generation
- `src/features/reminders/scheduler.ts`: 1-minute polling and sent marking

## Run

1. `npm install`
2. `npm run tauri:dev`

For browser-only `npm run dev`, the app will show a runtime warning because SQLite plugin requires Tauri runtime.
