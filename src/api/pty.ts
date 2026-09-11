import { invoke } from "@tauri-apps/api/core";
import type { PtyTabInfo, RunSession } from "../types";

export function startAutomation(automationId: string): Promise<RunSession> {
  return invoke("start_automation", { automationId });
}

export function startFreeTerminal(cwd?: string): Promise<PtyTabInfo> {
  return invoke("start_free_terminal", { cwd: cwd ?? null });
}

export function writeToPty(sessionId: string, data: string): Promise<void> {
  return invoke("write_to_pty", { sessionId, data });
}

export function resizePty(sessionId: string, cols: number, rows: number): Promise<void> {
  return invoke("resize_pty", { sessionId, cols, rows });
}

export function stopPty(sessionId: string): Promise<void> {
  return invoke("stop_pty", { sessionId });
}

export function stopAutomation(runId: string): Promise<void> {
  return invoke("stop_automation", { runId });
}

export function getPtyBacklog(sessionId: string): Promise<string> {
  return invoke("get_pty_backlog", { sessionId });
}

export function listActiveSessions(): Promise<PtyTabInfo[]> {
  return invoke("list_active_sessions");
}
