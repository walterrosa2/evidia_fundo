import { createContext } from "react";

/** Valor sobrescrito pelo demonstrador. Chave no formato `<caso>.<campo>`. */
export type DemoOverrides = Record<string, string>;

export type DemoEditContextValue = {
  /** Quando falso, nenhum indício de edição aparece na interface. */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  overrides: DemoOverrides;
  /** Lê o valor efetivo: o override, se houver; senão o original. */
  resolve: (key: string, original: string) => string;
  setOverride: (key: string, value: string) => void;
  clearOverride: (key: string) => void;
  resetAll: () => void;
  exportOverrides: () => string;
  importOverrides: (json: string) => boolean;
  /** Quantidade de campos atualmente sobrescritos. */
  count: number;
};

export const DemoEditContext = createContext<DemoEditContextValue | null>(null);

export const DEMO_EDIT_ENABLED_KEY = "evidia:demo-edit-enabled";
export const DEMO_EDIT_OVERRIDES_KEY = "evidia:demo-edit-overrides";
