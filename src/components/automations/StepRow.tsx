import { open } from "@tauri-apps/plugin-dialog";
import type { StepInput } from "../../types";

interface StepRowProps {
  index: number;
  step: StepInput;
  onChange: (index: number, step: StepInput) => void;
  onRemove: (index: number) => void;
  removable: boolean;
}

export function StepRow({ index, step, onChange, onRemove, removable }: StepRowProps) {
  async function browseFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      onChange(index, { ...step, cwd: selected });
    }
  }

  return (
    <div className="step-row">
      <span className="step-number">{index + 1}</span>
      <input
        className="step-label"
        placeholder="Nome do passo (opcional)"
        value={step.label ?? ""}
        onChange={(e) => onChange(index, { ...step, label: e.target.value || null })}
      />
      <div className="step-cwd">
        <input
          placeholder="Diretório a ser executado"
          value={step.cwd}
          onChange={(e) => onChange(index, { ...step, cwd: e.target.value })}
        />
        <button type="button" className="btn btn-small" onClick={browseFolder}>
          Procurar
        </button>
      </div>
      <input
        className="step-command"
        placeholder="Comando a ser executado (ex: npm run dev)"
        value={step.command}
        onChange={(e) => onChange(index, { ...step, command: e.target.value })}
      />
      <button
        type="button"
        className="btn btn-small btn-danger"
        onClick={() => onRemove(index)}
        disabled={!removable}
        title="Remover passo"
      >
        ✕
      </button>
    </div>
  );
}
