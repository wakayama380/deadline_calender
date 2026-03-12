import {
  BackupPayload,
  DashboardSummary,
  ReminderEvent,
  ReminderPolicy,
  ReminderPolicyInput,
  Task,
  TaskInput,
  TaskStatus,
  TaskWithPolicy
} from "../../shared/types/task";
import { dbExecute, dbSelect, initDatabase } from "../../shared/db/sqlite";
import { isInNextDays, isOverdue, isToday, nowIso } from "../../shared/utils/date";
import { createEventRows } from "../reminders/calc";

interface TaskRow {
  id: number;
  title: string;
  description: string;
  due_at: string;
  priority: "low" | "medium" | "high";
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  policy_id: number | null;
  policy_task_id: number | null;
  enabled: number | null;
  start_days_before: number | null;
  remind_count: number | null;
  remind_time: string | null;
  include_due_day: number | null;
  custom_mode: number | null;
  custom_offsets_json: string | null;
  policy_created_at: string | null;
  policy_updated_at: string | null;
}

interface ReminderEventRow {
  id: number;
  task_id: number;
  scheduled_at: string;
  sent_at: string | null;
  status: "pending" | "sent" | "skipped";
  message: string;
  created_at: string;
  updated_at: string;
}

interface PendingReminderRow {
  scheduled_at: string;
}

interface ReminderCountRow {
  count: number;
}

const defaultPolicy: ReminderPolicyInput = {
  enabled: true,
  startDaysBefore: 7,
  remindCount: 3,
  remindTime: "09:00",
  includeDueDay: true,
  customMode: false,
  customOffsetsJson: null
};

let readyPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = initDatabase();
  }
  await readyPromise;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toPolicy(row: TaskRow): ReminderPolicy {
  const createdAt = row.policy_created_at ?? nowIso();
  const updatedAt = row.policy_updated_at ?? createdAt;

  return {
    id: row.policy_id ?? 0,
    taskId: row.policy_task_id ?? row.id,
    enabled: (row.enabled ?? 1) === 1,
    startDaysBefore: row.start_days_before ?? defaultPolicy.startDaysBefore,
    remindCount: row.remind_count ?? defaultPolicy.remindCount,
    remindTime: row.remind_time ?? defaultPolicy.remindTime,
    includeDueDay: (row.include_due_day ?? 1) === 1,
    customMode: (row.custom_mode ?? 0) === 1,
    customOffsetsJson: row.custom_offsets_json ?? null,
    createdAt,
    updatedAt
  };
}

function toPolicyInput(policy: ReminderPolicy): ReminderPolicyInput {
  return {
    enabled: policy.enabled,
    startDaysBefore: policy.startDaysBefore,
    remindCount: policy.remindCount,
    remindTime: policy.remindTime,
    includeDueDay: policy.includeDueDay,
    customMode: policy.customMode,
    customOffsetsJson: policy.customOffsetsJson
  };
}

async function savePolicy(taskId: number, policy: ReminderPolicyInput): Promise<void> {
  const timestamp = nowIso();

  const existing = await dbSelect<{ id: number }>(
    `SELECT id FROM reminder_policies WHERE task_id = ? LIMIT 1`,
    [taskId]
  );

  if (existing[0]) {
    await dbExecute(
      `UPDATE reminder_policies
        SET enabled = ?,
            start_days_before = ?,
            remind_count = ?,
            remind_time = ?,
            include_due_day = ?,
            custom_mode = ?,
            custom_offsets_json = ?,
            updated_at = ?
      WHERE task_id = ?`,
      [
        policy.enabled ? 1 : 0,
        policy.startDaysBefore,
        policy.remindCount,
        policy.remindTime,
        policy.includeDueDay ? 1 : 0,
        policy.customMode ? 1 : 0,
        policy.customOffsetsJson,
        timestamp,
        taskId
      ]
    );
    return;
  }

  await dbExecute(
    `INSERT INTO reminder_policies (
      task_id,
      enabled,
      start_days_before,
      remind_count,
      remind_time,
      include_due_day,
      custom_mode,
      custom_offsets_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      policy.enabled ? 1 : 0,
      policy.startDaysBefore,
      policy.remindCount,
      policy.remindTime,
      policy.includeDueDay ? 1 : 0,
      policy.customMode ? 1 : 0,
      policy.customOffsetsJson,
      timestamp,
      timestamp
    ]
  );
}

async function regenerateEvents(taskId: number, task: TaskInput, policy: ReminderPolicyInput): Promise<void> {
  await dbExecute("DELETE FROM reminder_events WHERE task_id = ?", [taskId]);
  const rows = createEventRows(taskId, task, policy);

  for (const row of rows) {
    await dbExecute(
      `INSERT INTO reminder_events (
        task_id,
        scheduled_at,
        sent_at,
        status,
        message,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [row.taskId, row.scheduledAt, row.sentAt, row.status, row.message, row.createdAt, row.updatedAt]
    );
  }
}

export async function listTasks(): Promise<TaskWithPolicy[]> {
  await ensureReady();
  const rows = await dbSelect<TaskRow>(
    `SELECT
      t.id,
      t.title,
      t.description,
      t.due_at,
      t.priority,
      t.status,
      t.created_at,
      t.updated_at,
      rp.id AS policy_id,
      rp.task_id AS policy_task_id,
      rp.enabled,
      rp.start_days_before,
      rp.remind_count,
      rp.remind_time,
      rp.include_due_day,
      rp.custom_mode,
      rp.custom_offsets_json,
      rp.created_at AS policy_created_at,
      rp.updated_at AS policy_updated_at
    FROM tasks t
    LEFT JOIN reminder_policies rp ON rp.task_id = t.id
    ORDER BY t.due_at ASC`
  );

  return rows.map((row) => ({
    ...toTask(row),
    policy: toPolicy(row)
  }));
}

export async function getTask(taskId: number): Promise<TaskWithPolicy | null> {
  await ensureReady();
  const rows = await dbSelect<TaskRow>(
    `SELECT
      t.id,
      t.title,
      t.description,
      t.due_at,
      t.priority,
      t.status,
      t.created_at,
      t.updated_at,
      rp.id AS policy_id,
      rp.task_id AS policy_task_id,
      rp.enabled,
      rp.start_days_before,
      rp.remind_count,
      rp.remind_time,
      rp.include_due_day,
      rp.custom_mode,
      rp.custom_offsets_json,
      rp.created_at AS policy_created_at,
      rp.updated_at AS policy_updated_at
    FROM tasks t
    LEFT JOIN reminder_policies rp ON rp.task_id = t.id
    WHERE t.id = ?
    LIMIT 1`,
    [taskId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    ...toTask(row),
    policy: toPolicy(row)
  };
}

export async function createTask(task: TaskInput, policy: ReminderPolicyInput): Promise<TaskWithPolicy> {
  await ensureReady();
  const timestamp = nowIso();

  const insertResult = await dbExecute(
    `INSERT INTO tasks (
      title,
      description,
      due_at,
      priority,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [task.title, task.description, task.dueAt, task.priority, task.status, timestamp, timestamp]
  );

  let taskId = insertResult.lastInsertId;
  if (!taskId) {
    const idRow = await dbSelect<{ id: number }>("SELECT last_insert_rowid() AS id");
    taskId = idRow[0]?.id ?? null;
  }

  if (!taskId) {
    throw new Error("Failed to create task. Please try again.");
  }

  await savePolicy(taskId, policy);
  await regenerateEvents(taskId, task, policy);

  const created = await getTask(taskId);
  if (!created) {
    throw new Error("Created task could not be loaded.");
  }

  return created;
}

export async function updateTask(taskId: number, task: TaskInput, policy: ReminderPolicyInput): Promise<TaskWithPolicy> {
  await ensureReady();
  const timestamp = nowIso();

  await dbExecute(
    `UPDATE tasks
      SET title = ?,
          description = ?,
          due_at = ?,
          priority = ?,
          status = ?,
          updated_at = ?
    WHERE id = ?`,
    [task.title, task.description, task.dueAt, task.priority, task.status, timestamp, taskId]
  );

  await savePolicy(taskId, policy);
  await regenerateEvents(taskId, task, policy);

  const updated = await getTask(taskId);
  if (!updated) {
    throw new Error("Updated task could not be loaded.");
  }

  return updated;
}

export async function deleteTask(taskId: number): Promise<void> {
  await ensureReady();
  await dbExecute("DELETE FROM tasks WHERE id = ?", [taskId]);
}

export async function updateTaskStatus(taskId: number, status: TaskStatus): Promise<void> {
  await ensureReady();
  await dbExecute(
    `UPDATE tasks
      SET status = ?,
          updated_at = ?
    WHERE id = ?`,
    [status, nowIso(), taskId]
  );
}

export async function listTaskEvents(taskId: number): Promise<ReminderEvent[]> {
  await ensureReady();
  const rows = await dbSelect<ReminderEventRow>(
    `SELECT
      id,
      task_id,
      scheduled_at,
      sent_at,
      status,
      message,
      created_at,
      updated_at
    FROM reminder_events
    WHERE task_id = ?
    ORDER BY scheduled_at ASC`,
    [taskId]
  );

  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await ensureReady();

  const tasks = await listTasks();
  const openTasks = tasks.filter((task) => task.status !== "done");

  const pendingRows = await dbSelect<PendingReminderRow>(
    `SELECT re.scheduled_at
     FROM reminder_events re
     INNER JOIN tasks t ON t.id = re.task_id
     WHERE re.status = 'pending'
       AND t.status != 'done'`
  );

  return {
    dueToday: openTasks.filter((task) => isToday(task.dueAt)).length,
    dueThisWeek: openTasks.filter((task) => isInNextDays(task.dueAt, 7)).length,
    overdue: openTasks.filter((task) => isOverdue(task.dueAt)).length,
    remindersToday: pendingRows.filter((row) => isToday(row.scheduled_at)).length
  };
}

export async function exportBackup(): Promise<BackupPayload> {
  await ensureReady();

  const taskRows = await dbSelect<TaskRow>(
    `SELECT
      t.id,
      t.title,
      t.description,
      t.due_at,
      t.priority,
      t.status,
      t.created_at,
      t.updated_at,
      rp.id AS policy_id,
      rp.task_id AS policy_task_id,
      rp.enabled,
      rp.start_days_before,
      rp.remind_count,
      rp.remind_time,
      rp.include_due_day,
      rp.custom_mode,
      rp.custom_offsets_json,
      rp.created_at AS policy_created_at,
      rp.updated_at AS policy_updated_at
    FROM tasks t
    LEFT JOIN reminder_policies rp ON rp.task_id = t.id
    ORDER BY t.id ASC`
  );

  const tasks = taskRows.map(toTask);
  const policies = taskRows.map(toPolicy);

  return {
    version: 1,
    exportedAt: nowIso(),
    tasks,
    policies
  };
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  await ensureReady();

  await dbExecute("DELETE FROM reminder_events");
  await dbExecute("DELETE FROM reminder_policies");
  await dbExecute("DELETE FROM tasks");

  for (const task of payload.tasks) {
    await dbExecute(
      `INSERT INTO tasks (
        id,
        title,
        description,
        due_at,
        priority,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [task.id, task.title, task.description, task.dueAt, task.priority, task.status, task.createdAt, task.updatedAt]
    );
  }

  for (const policy of payload.policies) {
    await dbExecute(
      `INSERT INTO reminder_policies (
        task_id,
        enabled,
        start_days_before,
        remind_count,
        remind_time,
        include_due_day,
        custom_mode,
        custom_offsets_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        policy.taskId,
        policy.enabled ? 1 : 0,
        policy.startDaysBefore,
        policy.remindCount,
        policy.remindTime,
        policy.includeDueDay ? 1 : 0,
        policy.customMode ? 1 : 0,
        policy.customOffsetsJson,
        policy.createdAt,
        policy.updatedAt
      ]
    );
  }

  const tasksWithPolicies = await listTasks();
  for (const item of tasksWithPolicies) {
    const taskInput: TaskInput = {
      title: item.title,
      description: item.description,
      dueAt: item.dueAt,
      priority: item.priority,
      status: item.status
    };
    await regenerateEvents(item.id, taskInput, toPolicyInput(item.policy));
  }
}

export interface ReminderQueueStatus {
  totalPending: number;
  duePending: number;
  nextScheduledAt: string | null;
}

export async function getReminderQueueStatus(): Promise<ReminderQueueStatus> {
  await ensureReady();

  const [totalRows, dueRows, nextRows] = await Promise.all([
    dbSelect<ReminderCountRow>(
      `SELECT COUNT(*) AS count
       FROM reminder_events re
       INNER JOIN tasks t ON t.id = re.task_id
       WHERE re.status = 'pending'
         AND t.status != 'done'`
    ),
    dbSelect<ReminderCountRow>(
      `SELECT COUNT(*) AS count
       FROM reminder_events re
       INNER JOIN tasks t ON t.id = re.task_id
       WHERE re.status = 'pending'
         AND julianday(re.scheduled_at) <= julianday('now')
         AND t.status != 'done'`
    ),
    dbSelect<PendingReminderRow>(
      `SELECT re.scheduled_at
       FROM reminder_events re
       INNER JOIN tasks t ON t.id = re.task_id
       WHERE re.status = 'pending'
         AND t.status != 'done'
       ORDER BY re.scheduled_at ASC
       LIMIT 1`
    )
  ]);

  return {
    totalPending: Number(totalRows[0]?.count ?? 0),
    duePending: Number(dueRows[0]?.count ?? 0),
    nextScheduledAt: nextRows[0]?.scheduled_at ?? null
  };
}

export async function rebuildMissingReminderEvents(): Promise<number> {
  await ensureReady();

  const tasks = await listTasks();
  const now = Date.now();
  let rebuilt = 0;

  for (const item of tasks) {
    if (item.status === "done" || !item.policy.enabled) {
      continue;
    }

    if (new Date(item.dueAt).getTime() <= now) {
      continue;
    }

    const pendingRows = await dbSelect<ReminderCountRow>(
      `SELECT COUNT(*) AS count
       FROM reminder_events
       WHERE task_id = ?
         AND status = 'pending'`,
      [item.id]
    );

    const pendingCount = Number(pendingRows[0]?.count ?? 0);
    if (pendingCount > 0) {
      continue;
    }

    const taskInput: TaskInput = {
      title: item.title,
      description: item.description,
      dueAt: item.dueAt,
      priority: item.priority,
      status: item.status
    };

    await regenerateEvents(item.id, taskInput, toPolicyInput(item.policy));
    rebuilt += 1;
  }

  return rebuilt;
}

export interface DueReminderEvent {
  eventId: number;
  taskId: number;
  title: string;
  dueAt: string;
  scheduledAt: string;
  message: string;
}

export async function listDueReminderEvents(limit = 20): Promise<DueReminderEvent[]> {
  await ensureReady();
  return dbSelect<DueReminderEvent>(
    `SELECT
      re.id AS eventId,
      re.task_id AS taskId,
      t.title AS title,
      t.due_at AS dueAt,
      re.scheduled_at AS scheduledAt,
      re.message AS message
    FROM reminder_events re
    INNER JOIN tasks t ON t.id = re.task_id
    WHERE re.status = 'pending'
      AND julianday(re.scheduled_at) <= julianday('now')
      AND t.status != 'done'
    ORDER BY re.scheduled_at ASC
    LIMIT ?`,
    [limit]
  );
}

export async function markReminderSent(eventId: number): Promise<void> {
  await ensureReady();
  await dbExecute(
    `UPDATE reminder_events
     SET status = 'sent',
         sent_at = ?,
         updated_at = ?
     WHERE id = ?`,
    [nowIso(), nowIso(), eventId]
  );
}
