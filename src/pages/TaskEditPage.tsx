import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TaskForm } from "../features/tasks/components/TaskForm";
import { createTask, getTask, updateTask } from "../features/tasks/service";
import { ReminderPolicyInput, TaskInput, TaskWithPolicy } from "../shared/types/task";

export function TaskEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const taskId = params.taskId ? Number.parseInt(params.taskId, 10) : null;

  const [initialTask, setInitialTask] = useState<TaskWithPolicy | null>(null);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setInitialTask(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const task = await getTask(taskId);
        if (!cancelled) {
          if (!task) {
            setError("Task not found.");
          } else {
            setInitialTask(task);
            setError(null);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load task.";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function submit(payload: { task: TaskInput; policy: ReminderPolicyInput }) {
    if (taskId) {
      const updated = await updateTask(taskId, payload.task, payload.policy);
      navigate(`/tasks/${updated.id}`);
      return;
    }

    const created = await createTask(payload.task, payload.policy);
    navigate(`/tasks/${created.id}`);
  }

  return (
    <section>
      <div className="page-head">
        <h2>{taskId ? "Edit Task" : "New Task"}</h2>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p>Loading...</p> : null}

      {!loading && !error ? (
        <TaskForm
          initialValue={initialTask}
          submitLabel={taskId ? "Update Task" : "Create Task"}
          onSubmit={submit}
        />
      ) : null}
    </section>
  );
}
