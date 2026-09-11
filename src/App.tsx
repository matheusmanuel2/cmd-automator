import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import type { Automation, PtyTabInfo, StepInput } from "./types";
import { useAutomations } from "./hooks/useAutomations";
import { startAutomation, startFreeTerminal, stopPty } from "./api/pty";
import { AutomationsListView } from "./components/automations/AutomationsListView";
import { AutomationFormView } from "./components/automations/AutomationFormView";
import { RunView } from "./components/run/RunView";

type ViewName = "list" | "form" | "run";

function App() {
  const { automations, loading, create, update, remove } = useAutomations();

  const [view, setView] = useState<ViewName>("list");
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const [tabs, setTabs] = useState<PtyTabInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [exitedSessions, setExitedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unlistenPromises = tabs.map((tab) =>
      listen(`pty:${tab.session_id}:exit`, () => {
        setExitedSessions((prev) => new Set(prev).add(tab.session_id));
      }),
    );
    return () => {
      unlistenPromises.forEach((p) => p.then((f) => f()));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map((t) => t.session_id).join(",")]);

  const openCreateForm = useCallback(() => {
    setEditingAutomation(null);
    setView("form");
  }, []);

  const openEditForm = useCallback((automation: Automation) => {
    setEditingAutomation(automation);
    setView("form");
  }, []);

  const handleSave = useCallback(
    async (name: string, steps: StepInput[]) => {
      if (editingAutomation) {
        await update(editingAutomation.id, name, steps);
      } else {
        await create(name, steps);
      }
      setView("list");
    },
    [editingAutomation, create, update],
  );

  const handleStart = useCallback(async (automation: Automation) => {
    const session = await startAutomation(automation.id);
    setTabs((prev) => [...prev, ...session.tabs]);
    setActiveSessionId(session.tabs[0]?.session_id ?? null);
    setView("run");
  }, []);

  const handleAddFreeTerminal = useCallback(async () => {
    const tab = await startFreeTerminal();
    setTabs((prev) => [...prev, tab]);
    setActiveSessionId(tab.session_id);
  }, []);

  const handleCloseTab = useCallback(
    (sessionId: string) => {
      stopPty(sessionId).catch(() => {});
      setTabs((prev) => {
        const next = prev.filter((t) => t.session_id !== sessionId);
        if (activeSessionId === sessionId) {
          setActiveSessionId(next.length > 0 ? next[next.length - 1].session_id : null);
        }
        return next;
      });
      setExitedSessions((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    },
    [activeSessionId],
  );

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <button
          className={"nav-btn" + (view === "list" || view === "form" ? " active" : "")}
          onClick={() => setView("list")}
        >
          Automações
        </button>
        <button
          className={"nav-btn" + (view === "run" ? " active" : "")}
          onClick={() => setView("run")}
        >
          Logs
          {tabs.length > 0 && <span className="badge">{tabs.length}</span>}
        </button>
      </nav>

      <main className="main-content">
        <div className={"view" + (view === "list" ? "" : " view-hidden")}>
          <AutomationsListView
            automations={automations}
            loading={loading}
            onCreate={openCreateForm}
            onEdit={openEditForm}
            onDelete={remove}
            onStart={handleStart}
          />
        </div>

        <div className={"view" + (view === "form" ? "" : " view-hidden")}>
          <AutomationFormView
            automation={editingAutomation}
            onSave={handleSave}
            onCancel={() => setView("list")}
          />
        </div>

        <div className={"view view-run" + (view === "run" ? "" : " view-hidden")}>
          <RunView
            tabs={tabs}
            activeSessionId={activeSessionId}
            exitedSessions={exitedSessions}
            onSelectTab={setActiveSessionId}
            onCloseTab={handleCloseTab}
            onAddFreeTerminal={handleAddFreeTerminal}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
