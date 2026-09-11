import { useRef } from "react";
import { usePtySession } from "../../hooks/usePtySession";

interface TerminalPaneProps {
  sessionId: string;
  isActive: boolean;
}

export function TerminalPane({ sessionId, isActive }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  usePtySession(sessionId, containerRef, isActive);

  return (
    <div
      className="terminal-pane"
      style={{ display: isActive ? "block" : "none" }}
      ref={containerRef}
    />
  );
}
