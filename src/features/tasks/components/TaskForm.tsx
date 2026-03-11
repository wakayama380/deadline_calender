import { FormEvent, useEffect, useState } from "react";
import { taskSchema, TaskFormValues } from "../schema";
import { ReminderPolicyInput, TaskInput, TaskWithPolicy } from "../../../shared/types/task";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../../../shared/utils/date";

interface TaskFormProps {
  initialValue?: TaskWithPolicy | null;
  submitLabel: string;
  onSubmit: (payload: { task: TaskInput; policy: ReminderPolicyInput }) => Promise<void>;
}

function createDefaultValues(): TaskFormValues {
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 1);

  return {
    title: "",
    description: "",
    dueAt: toDateTimeLocalInput(dueAt.toISOString()),
    priority: "medium",
    status: "todo",
    enabled: true,
    startDaysBefore: 7,
    remindCount: 3,
    remindTime: "09:00",
    includeDueDay: true,
    customMode: false,
    customOffsetsJson: null
  };
}

function fromTask(task: TaskWithPolicy): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    dueAt: toDateTimeLocalInput(task.dueAt),
    priority: task.priority,
    status: task.status,
    enabled: task.policy.enabled,
    startDaysBefore: task.policy.startDaysBefore,
    remindCount: task.policy.remindCount,
    remindTime: task.policy.remindTime,
    includeDueDay: task.policy.includeDueDay,
    customMode: task.policy.customMode,
    customOffsetsJson: task.policy.customOffsetsJson
  };
}

export function TaskForm({ initialValue, submitLabel, onSubmit }: TaskFormProps) {
  const [form, setForm] = useState<TaskFormValues>(createDefaultValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValue) {
      setForm(fromTask(initialValue));
      return;
    }

    setForm(createDefaultValues());
  }, [initialValue]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = taskSchema.safeParse(form);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Validation failed.";
      setError(message);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = parsed.data;
      await onSubmit({
        task: {
          title: payload.title,
          description: payload.description,
          dueAt: fromDateTimeLocalInput(payload.dueAt),
          priority: payload.priority,
          status: payload.status
        },
        policy: {
          enabled: payload.enabled,
          startDaysBefore: payload.startDaysBefore,
          remindCount: payload.remindCount,
          remindTime: payload.remindTime,
          includeDueDay: payload.includeDueDay,
          customMode: payload.customMode,
          customOffsetsJson: payload.customOffsetsJson
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="task-form" onSubmit={submit}>
      {error ? <p className="error-text">{error}</p> : null}

      <label>
        Title
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Submit quarterly report"
          required
        />
      </label>

      <label>
        Description
        <textarea
          rows={4}
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Optional context"
        />
      </label>

      <label>
        Due At
        <input
          type="datetime-local"
          value={form.dueAt}
          onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
          required
        />
      </label>

      <div className="grid-two">
        <label>
          Priority
          <select
            value={form.priority}
            onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as TaskFormValues["priority"] }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          Status
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TaskFormValues["status"] }))}
          >
            <option value="todo">Todo</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Reminder Policy</legend>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
          />
          Enable reminder
        </label>

        <div className="grid-three">
          <label>
            Start days before
            <input
              type="number"
              min={0}
              max={365}
              value={form.startDaysBefore}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startDaysBefore: Number.parseInt(event.target.value || "0", 10) }))
              }
            />
          </label>

          <label>
            Remind count
            <input
              type="number"
              min={1}
              max={30}
              value={form.remindCount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, remindCount: Number.parseInt(event.target.value || "1", 10) }))
              }
            />
          </label>

          <label>
            Remind time
            <input
              type="time"
              value={form.remindTime}
              onChange={(event) => setForm((prev) => ({ ...prev, remindTime: event.target.value }))}
            />
          </label>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.includeDueDay}
            onChange={(event) => setForm((prev) => ({ ...prev, includeDueDay: event.target.checked }))}
          />
          Include due day
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.customMode}
            onChange={(event) => setForm((prev) => ({ ...prev, customMode: event.target.checked }))}
          />
          Use custom offsets
        </label>

        {form.customMode ? (
          <label>
            Custom offsets JSON (example: [7,3,1,0])
            <input
              value={form.customOffsetsJson ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  customOffsetsJson: event.target.value.trim().length ? event.target.value : null
                }))
              }
            />
          </label>
        ) : null}
      </fieldset>

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

