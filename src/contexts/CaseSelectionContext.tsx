import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CaseSelectionContext,
  type CaseSelectionContextValue,
} from "@/contexts/caseSelectionStore";
import { featuredDealId, mockDeals } from "@/data/mockDeals";
import { realCasesV2 } from "@/data/v2";

const STORAGE_KEY = "evidia:selected-case";

function isAvailableCase(caseId: string | null): caseId is string {
  return caseId !== null && mockDeals.some((deal) => deal.id === caseId);
}

export function CaseSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedCaseId, setSelectedCaseId] = useState(featuredDealId);

  useEffect(() => {
    const storedCaseId = window.localStorage.getItem(STORAGE_KEY);
    if (isAvailableCase(storedCaseId)) setSelectedCaseId(storedCaseId);
  }, []);

  const selectCase = useCallback((caseId: string) => {
    if (!isAvailableCase(caseId)) return;
    setSelectedCaseId(caseId);
    window.localStorage.setItem(STORAGE_KEY, caseId);
  }, []);

  const value = useMemo<CaseSelectionContextValue>(() => {
    const selectedDeal = mockDeals.find((deal) => deal.id === selectedCaseId) ?? mockDeals[0];
    const selectedCase =
      realCasesV2.find((caseItem) => caseItem.id === selectedDeal.id) ?? realCasesV2[0];

    return { selectedCaseId: selectedDeal.id, selectedDeal, selectedCase, selectCase };
  }, [selectCase, selectedCaseId]);

  return <CaseSelectionContext.Provider value={value}>{children}</CaseSelectionContext.Provider>;
}
