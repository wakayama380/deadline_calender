import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteTask, getTask, listTaskEvents, updateTaskStatus } from "../features/tasks/service";
import { ReminderEvent, TaskWithPolicy } from "../shared/types/task";
import { formatDateTime } from "../shared/utils/date";

export function TaskDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const taskId = Number.parseInt(params.taskId ?? "", 10);

  const [task, setTask] = useState<TaskWithPolicy | null>(null);
  const [events, setEvents] = useState<ReminderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!Number.isFinite(taskId)) {
      setError("Task id is invalid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [taskValue, eventRows] = await Promise.all([getTask(taskId), listTaskEvents(taskId)]);
      if (!taskValue) {
        setError("Task not found.");
        setTask(null);
      } else {
        setTask(taskValue);
        setError(null);
      }
      setEvents(eventRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load task detail.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [taskId]);

  async function toggleDone() {
    if (!task) {
      return;
    }

    const nextStatus = task.status === "done" ? "todo" : "done";
    await updateTaskStatus(task.id, nextStatus);
    await refresh();
  }

  async function removeTask() {
    if (!task) {
      return;
    }

    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) {
      return;
    }

    await deleteTask(task.id);
    navigate("/tasks");
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (!task) {
    return <p className="muted">Task not found.</p>;
  }

  return (
    <section>
      <div className="page-head">
        <h2>{task.title}</h2>
        <div className="inline-actions">
          <button onClick={() => void refresh()}>Refresh</button>
          <Link to={`/tasks/${task.id}/edit`} className="button-link">
            Edit
          </Link>
          <button onClick={() => void toggleDone()}>
            {task.status === "done" ? "Mark Todo" : "Mark Done"}
          </button>
          <button className="danger" onClick={() => void removeTask()}>
            Delete
          </button>
        </div>
      </div>

      <div className="panel">
        <p>
          <strong>Due:</strong> {formatDateTime(task.dueAt)}
        </p>
        <p>
          <strong>Priority:</strong> {task.priority}
        </p>
        <p>
          <strong>Status:</strong> {task.status}
        </p>
        <p>
          <strong>Description:</strong> {task.description || "-"}
        </p>
      </div>

      <div className="panel">
        <h3>Reminder Events</h3>
        {events.length === 0 ? <p className="muted">No reminder events generated.</p> : null}
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <span>{formatDateTime(event.scheduledAt)}</span>
              <span className={`badge ${event.status}`}>{event.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
