import { useEffect, useState } from "react";
import { TaskWithPolicy } from "../../../shared/types/task";
import { listTasks } from "../service";

export function useTasks() {
  const [tasks, setTasks] = useState<TaskWithPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listTasks();
      setTasks(rows);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    tasks,
    loading,
    error,
    refresh
  };
}
