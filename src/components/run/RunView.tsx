import type { PtyTabInfo } from "../../types";
import { TerminalPane } from "./TerminalPane";
import { TerminalTabsBar } from "./TerminalTabsBar";

interface RunViewProps {
  tabs: PtyTabInfo[];
  activeSessionId: string | null;
  exitedSessions: Set<string>;
  onSelectTab: (sessionId: string) => void;
  onCloseTab: (sessionId: string) => void;
  onAddFreeTerminal: () => void;
}

export function RunView({
  tabs,
  activeSessionId,
  exitedSessions,
  onSelectTab,
  onCloseTab,
  onAddFreeTerminal,
}: RunViewProps) {
  return (
    <div className="run-view">
      <TerminalTabsBar
        tabs={tabs}
        activeSessionId={activeSessionId}
        exitedSessions={exitedSessions}
        onSelect={onSelectTab}
        onClose={onCloseTab}
        onAddFreeTerminal={onAddFreeTerminal}
      />
      <div className="terminal-panes">
        {tabs.length === 0 && (
          <p className="muted terminal-empty">
            Nenhum terminal ativo. Inicie uma automação ou clique em "+" pra abrir um terminal
            livre.
          </p>
        )}
        {tabs.map((tab) => (
          <TerminalPane
            key={tab.session_id}
            sessionId={tab.session_id}
            isActive={tab.session_id === activeSessionId}
          />
        ))}
      </div>
    </div>
  );
}
