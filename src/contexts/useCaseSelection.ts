import { useContext } from "react";
import { CaseSelectionContext } from "@/contexts/caseSelectionStore";

export function useCaseSelection() {
  const context = useContext(CaseSelectionContext);
  if (!context) {
    throw new Error("useCaseSelection deve ser usado dentro de CaseSelectionProvider.");
  }
  return context;
}
