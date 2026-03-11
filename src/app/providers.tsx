import { PropsWithChildren, useEffect, useState } from "react";
import { initDatabase } from "../shared/db/sqlite";
import { startReminderScheduler } from "../features/reminders/scheduler";

export function AppProviders({ children }: PropsWithChildren) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await initDatabase();
        if (!cancelled) {
          cleanup = startReminderScheduler();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "App initialization failed.";
        if (!cancelled) {
          setRuntimeError(message);
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <>
      {runtimeError ? <div className="runtime-banner">{runtimeError}</div> : null}
      {children}
    </>
  );
}
