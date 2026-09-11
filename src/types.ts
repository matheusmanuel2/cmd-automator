export interface AutomationStep {
  id: string;
  label: string | null;
  cwd: string;
  command: string;
}

export interface Automation {
  id: string;
  name: string;
  steps: AutomationStep[];
  created_at: string;
  updated_at: string;
}

export interface StepInput {
  label: string | null;
  cwd: string;
  command: string;
}

export interface PtyTabInfo {
  session_id: string;
  run_id: string | null;
  step_id: string | null;
  label: string;
  cwd: string;
  command: string;
}

export interface RunSession {
  run_id: string;
  automation_id: string;
  tabs: PtyTabInfo[];
}
