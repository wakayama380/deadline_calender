import { isTauri } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

const schemaStatements = [
  "PRAGMA foreign_keys = ON;",
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_at TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('low','medium','high')),
    status TEXT NOT NULL CHECK(status IN ('todo','doing','done')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS reminder_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    start_days_before INTEGER NOT NULL DEFAULT 7,
    remind_count INTEGER NOT NULL DEFAULT 3,
    remind_time TEXT NOT NULL DEFAULT '09:00',
    include_due_day INTEGER NOT NULL DEFAULT 1,
    custom_mode INTEGER NOT NULL DEFAULT 0,
    custom_offsets_json TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS reminder_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    scheduled_at TEXT NOT NULL,
    sent_at TEXT DEFAULT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','sent','skipped')),
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );`,
  "CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);",
  "CREATE INDEX IF NOT EXISTS idx_events_sched_status ON reminder_events(status, scheduled_at);"
] as const;

let instance: Database | null = null;
let initPromise: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation, operation);
  queue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function requireDb(): Promise<Database> {
  if (!isTauri()) {
    throw new Error("Tauri runtime is required. Run this app via `npm run tauri:dev`.");
  }

  if (!instance) {
    instance = await Database.load("sqlite:deadline_calender.db");
  }

  return instance;
}

export async function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = enqueue(async () => {
      const db = await requireDb();
      for (const statement of schemaStatements) {
        await db.execute(statement);
      }
    });
  }

  await initPromise;
}

export interface ExecuteResult {
  rowsAffected: number;
  lastInsertId: number | null;
}

export async function dbExecute(query: string, values: unknown[] = []): Promise<ExecuteResult> {
  return enqueue(async () => {
    const db = await requireDb();
    const result = await db.execute(query, values);

    const rowsAffected = typeof result?.rowsAffected === "number" ? result.rowsAffected : 0;
    const rawLastInsertId = result?.lastInsertId;

    let lastInsertId: number | null = null;
    if (typeof rawLastInsertId === "number") {
      lastInsertId = rawLastInsertId;
    } else if (typeof rawLastInsertId === "string") {
      const parsed = Number.parseInt(rawLastInsertId, 10);
      lastInsertId = Number.isNaN(parsed) ? null : parsed;
    }

    return {
      rowsAffected,
      lastInsertId
    };
  });
}

export async function dbSelect<T>(query: string, values: unknown[] = []): Promise<T[]> {
  return enqueue(async () => {
    const db = await requireDb();
    const rows = await db.select<T>(query, values);

    if (Array.isArray(rows)) {
      return rows as T[];
    }

    if (rows == null) {
      return [];
    }

    return [rows as T];
  });
}