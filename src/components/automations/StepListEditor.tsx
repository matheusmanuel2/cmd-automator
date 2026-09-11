import type { StepInput } from "../../types";
import { StepRow } from "./StepRow";

interface StepListEditorProps {
  steps: StepInput[];
  onChange: (steps: StepInput[]) => void;
}

export function StepListEditor({ steps, onChange }: StepListEditorProps) {
  function updateStep(index: number, step: StepInput) {
    const next = [...steps];
    next[index] = step;
    onChange(next);
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function addStep() {
    onChange([...steps, { label: null, cwd: "", command: "" }]);
  }

  return (
    <div className="step-list-editor">
      <div className="step-list-header">
        <span>#</span>
        <span>Nome</span>
        <span>Diretório</span>
        <span>Comando</span>
        <span></span>
      </div>
      {steps.map((step, index) => (
        <StepRow
          key={index}
          index={index}
          step={step}
          onChange={updateStep}
          onRemove={removeStep}
          removable={steps.length > 1}
        />
      ))}
      <button type="button" className="btn btn-add-step" onClick={addStep}>
        + Adicionar passo
      </button>
    </div>
  );
}
