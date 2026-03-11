import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary, listTasks } from "../features/tasks/service";
import { DashboardSummary, TaskWithPolicy } from "../shared/types/task";
import { formatDateTime, isInNextDays, isOverdue, isToday } from "../shared/utils/date";
import { getErrorMessage } from "../shared/utils/error";

const defaultSummary: DashboardSummary = {
  dueToday: 0,
  dueThisWeek: 0,
  overdue: 0,
  remindersToday: 0
};

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [tasks, setTasks] = useState<TaskWithPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const taskRows = await listTasks();
      const summaryValue = await getDashboardSummary();
      setSummary(summaryValue);
      setTasks(taskRows);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load dashboard."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const openTasks = tasks.filter((task) => task.status !== "done");
  const todayTasks = openTasks.filter((task) => isToday(task.dueAt));
  const weekTasks = openTasks.filter((task) => isInNextDays(task.dueAt, 7));
  const overdueTasks = openTasks.filter((task) => isOverdue(task.dueAt));

  return (
    <section>
      <div className="page-head">
        <h2>Dashboard</h2>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="card-grid">
        <article className="stat-card">
          <p>Due Today</p>
          <strong>{summary.dueToday}</strong>
        </article>
        <article className="stat-card">
          <p>Due This Week</p>
          <strong>{summary.dueThisWeek}</strong>
        </article>
        <article className="stat-card">
          <p>Overdue</p>
          <strong>{summary.overdue}</strong>
        </article>
        <article className="stat-card">
          <p>Reminders Today</p>
          <strong>{summary.remindersToday}</strong>
        </article>
      </div>

      <div className="section-grid">
        <article className="panel">
          <h3>Today</h3>
          {todayTasks.length === 0 ? <p className="muted">No tasks due today.</p> : null}
          <ul>
            {todayTasks.slice(0, 5).map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                <span>{formatDateTime(task.dueAt)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>Next 7 Days</h3>
          {weekTasks.length === 0 ? <p className="muted">No upcoming deadlines.</p> : null}
          <ul>
            {weekTasks.slice(0, 7).map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                <span>{formatDateTime(task.dueAt)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>Overdue</h3>
          {overdueTasks.length === 0 ? <p className="muted">No overdue tasks.</p> : null}
          <ul>
            {overdueTasks.slice(0, 5).map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                <span>{formatDateTime(task.dueAt)}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}