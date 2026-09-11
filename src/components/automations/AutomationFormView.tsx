import { useEffect, useState } from "react";
import type { Automation, StepInput } from "../../types";
import { StepListEditor } from "./StepListEditor";

interface AutomationFormViewProps {
  automation: Automation | null;
  onSave: (name: string, steps: StepInput[]) => Promise<void>;
  onCancel: () => void;
}

function emptyStep(): StepInput {
  return { label: null, cwd: "", command: "" };
}

export function AutomationFormView({ automation, onSave, onCancel }: AutomationFormViewProps) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<StepInput[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setSteps(
        automation.steps.map((s) => ({ label: s.label, cwd: s.cwd, command: s.command })),
      );
    } else {
      setName("");
      setSteps([emptyStep()]);
    }
  }, [automation]);

  const isValid =
    name.trim().length > 0 &&
    steps.length > 0 &&
    steps.every((s) => s.cwd.trim().length > 0 && s.command.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(name.trim(), steps);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="automation-form" onSubmit={handleSubmit}>
      <h2>{automation ? "Editar automação" : "Nova automação"}</h2>
      <label className="field">
        <span>Nome da automação</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Kursinha Full Stack"
          autoFocus
        />
      </label>

      <StepListEditor steps={steps} onChange={setSteps} />

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={!isValid || saving}>
          {saving ? "Salvando..." : "Salvar automação"}
        </button>
      </div>
    </form>
  );
}
