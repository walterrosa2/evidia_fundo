import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_EDIT_ENABLED_KEY,
  DEMO_EDIT_OVERRIDES_KEY,
  DemoEditContext,
  type DemoEditContextValue,
  type DemoOverrides,
} from "@/contexts/demoEditStore";

/**
 * Modo edição da demonstração.
 *
 * A fonte de dados permanece imutável: as alterações do demonstrador vivem numa camada de
 * override aplicada apenas na leitura. Quando o modo está desligado — o padrão — a interface
 * não exibe qualquer affordance de edição.
 */
export function DemoEditProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [overrides, setOverrides] = useState<DemoOverrides>({});

  useEffect(() => {
    setEnabledState(window.localStorage.getItem(DEMO_EDIT_ENABLED_KEY) === "true");
    const stored = window.localStorage.getItem(DEMO_EDIT_OVERRIDES_KEY);
    if (!stored) return;
    try {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === "object") setOverrides(parsed as DemoOverrides);
    } catch {
      window.localStorage.removeItem(DEMO_EDIT_OVERRIDES_KEY);
    }
  }, []);

  const persist = useCallback((next: DemoOverrides) => {
    setOverrides(next);
    window.localStorage.setItem(DEMO_EDIT_OVERRIDES_KEY, JSON.stringify(next));
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    window.localStorage.setItem(DEMO_EDIT_ENABLED_KEY, String(value));
  }, []);

  const resolve = useCallback(
    (key: string, original: string) => overrides[key] ?? original,
    [overrides],
  );

  const setOverride = useCallback(
    (key: string, value: string) => persist({ ...overrides, [key]: value }),
    [overrides, persist],
  );

  const clearOverride = useCallback(
    (key: string) => {
      const next = { ...overrides };
      delete next[key];
      persist(next);
    },
    [overrides, persist],
  );

  const resetAll = useCallback(() => {
    setOverrides({});
    window.localStorage.removeItem(DEMO_EDIT_OVERRIDES_KEY);
  }, []);

  const exportOverrides = useCallback(() => JSON.stringify(overrides, null, 2), [overrides]);

  const importOverrides = useCallback(
    (json: string) => {
      try {
        const parsed: unknown = JSON.parse(json);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
        const entries = Object.entries(parsed as Record<string, unknown>);
        if (entries.some(([, value]) => typeof value !== "string")) return false;
        persist(Object.fromEntries(entries) as DemoOverrides);
        return true;
      } catch {
        return false;
      }
    },
    [persist],
  );

  const value = useMemo<DemoEditContextValue>(
    () => ({
      enabled,
      setEnabled,
      overrides,
      resolve,
      setOverride,
      clearOverride,
      resetAll,
      exportOverrides,
      importOverrides,
      count: Object.keys(overrides).length,
    }),
    [
      enabled,
      setEnabled,
      overrides,
      resolve,
      setOverride,
      clearOverride,
      resetAll,
      exportOverrides,
      importOverrides,
    ],
  );

  return <DemoEditContext.Provider value={value}>{children}</DemoEditContext.Provider>;
}
