import { useState } from "react";
import type { Automation } from "../../types";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface AutomationsListViewProps {
  automations: Automation[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (automation: Automation) => void;
  onDelete: (id: string) => void;
  onStart: (automation: Automation) => void;
}

export function AutomationsListView({
  automations,
  loading,
  onCreate,
  onEdit,
  onDelete,
  onStart,
}: AutomationsListViewProps) {
  const [pendingDelete, setPendingDelete] = useState<Automation | null>(null);

  return (
    <div className="automations-list-view">
      <div className="view-header">
        <h1>Automações</h1>
        <button className="btn btn-primary" onClick={onCreate}>
          + Nova automação
        </button>
      </div>

      {loading && <p className="muted">Carregando...</p>}

      {!loading && automations.length === 0 && (
        <p className="muted">
          Nenhuma automação criada ainda. Clique em "Nova automação" pra configurar os passos
          (diretório + comando) que você quer rodar de uma vez.
        </p>
      )}

      <div className="automation-cards">
        {automations.map((automation) => (
          <div key={automation.id} className="automation-card">
            <div className="automation-card-header">
              <h3>{automation.name}</h3>
              <span className="step-count">{automation.steps.length} passo(s)</span>
            </div>
            <ul className="automation-steps-preview">
              {automation.steps.map((step) => (
                <li key={step.id}>
                  <strong>{step.label ?? step.command}</strong>
                  <span className="muted"> — {step.cwd}</span>
                </li>
              ))}
            </ul>
            <div className="automation-card-actions">
              <button className="btn btn-primary" onClick={() => onStart(automation)}>
                Iniciar
              </button>
              <button className="btn" onClick={() => onEdit(automation)}>
                Editar
              </button>
              <button className="btn btn-danger" onClick={() => setPendingDelete(automation)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir automação"
        message={`Tem certeza que deseja excluir "${pendingDelete?.name}"? Essa ação não pode ser desfeita.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
