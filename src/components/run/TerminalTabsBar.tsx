import type { PtyTabInfo } from "../../types";

interface TerminalTabsBarProps {
  tabs: PtyTabInfo[];
  activeSessionId: string | null;
  exitedSessions: Set<string>;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onAddFreeTerminal: () => void;
}

export function TerminalTabsBar({
  tabs,
  activeSessionId,
  exitedSessions,
  onSelect,
  onClose,
  onAddFreeTerminal,
}: TerminalTabsBarProps) {
  return (
    <div className="terminal-tabs-bar">
      {tabs.map((tab) => (
        <div
          key={tab.session_id}
          className={
            "terminal-tab" + (tab.session_id === activeSessionId ? " active" : "")
          }
          onClick={() => onSelect(tab.session_id)}
        >
          <span
            className={"tab-status-dot" + (exitedSessions.has(tab.session_id) ? " exited" : " running")}
          />
          <span className="tab-label">{tab.label}</span>
          <button
            type="button"
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.session_id);
            }}
            title="Fechar aba"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="tab-add" onClick={onAddFreeTerminal} title="Novo terminal livre">
        +
      </button>
    </div>
  );
}
