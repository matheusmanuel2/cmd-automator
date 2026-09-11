import { invoke } from "@tauri-apps/api/core";
import type { Automation, StepInput } from "../types";

export function listAutomations(): Promise<Automation[]> {
  return invoke("list_automations");
}

export function getAutomation(id: string): Promise<Automation> {
  return invoke("get_automation", { id });
}

export function createAutomation(name: string, steps: StepInput[]): Promise<Automation> {
  return invoke("create_automation", { name, steps });
}

export function updateAutomation(
  id: string,
  name: string,
  steps: StepInput[],
): Promise<Automation> {
  return invoke("update_automation", { id, name, steps });
}

export function deleteAutomation(id: string): Promise<void> {
  return invoke("delete_automation", { id });
}
