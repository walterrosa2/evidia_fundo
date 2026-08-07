import { createContext } from "react";
import type { Deal } from "@/data/mockDeals";
import type { RealCaseDemo } from "@/data/v2";

export type CaseSelectionContextValue = {
  selectedCaseId: string;
  selectedDeal: Deal;
  selectedCase: RealCaseDemo;
  selectCase: (caseId: string) => void;
};

export const CaseSelectionContext = createContext<CaseSelectionContextValue | null>(null);
