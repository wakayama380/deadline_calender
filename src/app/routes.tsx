import { NavLink, Outlet, createHashRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TaskDetailPage } from "../pages/TaskDetailPage";
import { TaskEditPage } from "../pages/TaskEditPage";
import { TaskListPage } from "../pages/TaskListPage";

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Deadline Calender</h1>
          <p>Local-first task and reminder manager</p>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/tasks/new">New</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "tasks", element: <TaskListPage /> },
      { path: "tasks/new", element: <TaskEditPage /> },
      { path: "tasks/:taskId", element: <TaskDetailPage /> },
      { path: "tasks/:taskId/edit", element: <TaskEditPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);

export default router;
