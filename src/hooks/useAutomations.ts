import { useCallback, useEffect, useState } from "react";
import * as api from "../api/automations";
import type { Automation, StepInput } from "../types";

export function useAutomations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listAutomations();
      setAutomations(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string, steps: StepInput[]) => {
      const automation = await api.createAutomation(name, steps);
      await refresh();
      return automation;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, name: string, steps: StepInput[]) => {
      const automation = await api.updateAutomation(id, name, steps);
      await refresh();
      return automation;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.deleteAutomation(id);
      await refresh();
    },
    [refresh],
  );

  return { automations, loading, refresh, create, update, remove };
}
