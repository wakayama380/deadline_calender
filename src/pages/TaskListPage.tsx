import { useState } from "react";
import { Link } from "react-router-dom";
import { useTasks } from "../features/tasks/hooks/useTasks";
import { deleteTask } from "../features/tasks/service";
import { TaskWithPolicy } from "../shared/types/task";
import { formatDateTime, isOverdue } from "../shared/utils/date";
import { getErrorMessage } from "../shared/utils/error";

type FilterMode = "all" | "open" | "done" | "overdue";
type SortMode = "due" | "priority" | "created";

function priorityRank(priority: TaskWithPolicy["priority"]): number {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}

function applyFilter(tasks: TaskWithPolicy[], filter: FilterMode): TaskWithPolicy[] {
  if (filter === "open") {
    return tasks.filter((task) => task.status !== "done");
  }
  if (filter === "done") {
    return tasks.filter((task) => task.status === "done");
  }
  if (filter === "overdue") {
    return tasks.filter((task) => task.status !== "done" && isOverdue(task.dueAt));
  }
  return tasks;
}

function applySort(tasks: TaskWithPolicy[], sort: SortMode): TaskWithPolicy[] {
  const cloned = [...tasks];
  if (sort === "created") {
    return cloned.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (sort === "priority") {
    return cloned.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
  }
  return cloned.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function TaskListPage() {
  const { tasks, loading, error, refresh } = useTasks();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("due");
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visible = applySort(applyFilter(tasks, filter), sort);

  async function handleDelete(task: TaskWithPolicy) {
    const confirmed = window.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingTaskId(task.id);
    setDeleteError(null);

    try {
      await deleteTask(task.id);
      await refresh();
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete task."));
    } finally {
      setDeletingTaskId(null);
    }
  }

  return (
    <section>
      <div className="page-head">
        <h2>Tasks</h2>
        <div className="inline-actions">
          <button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <Link to="/tasks/new" className="button-link">
            New Task
          </Link>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {deleteError ? <p className="error-text">{deleteError}</p> : null}

      <div className="toolbar">
        <label>
          Filter
          <select value={filter} onChange={(event) => setFilter(event.target.value as FilterMode)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>

        <label>
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="due">Due At</option>
            <option value="priority">Priority</option>
            <option value="created">Created At</option>
          </select>
        </label>
      </div>

      <div className="panel">
        {visible.length === 0 ? <p className="muted">No tasks found.</p> : null}

        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Due At</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((task) => (
              <tr key={task.id}>
                <td>
                  <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                </td>
                <td>{formatDateTime(task.dueAt)}</td>
                <td>
                  <span className={`badge ${task.priority}`}>{task.priority}</span>
                </td>
                <td>
                  <span className={`badge ${task.status}`}>{task.status}</span>
                </td>
                <td>
                  <button
                    className="danger"
                    onClick={() => void handleDelete(task)}
                    disabled={deletingTaskId === task.id}
                  >
                    {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}