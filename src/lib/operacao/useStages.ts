import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "./api";

/** Estado das etapas do dossiê, calculado pelo servidor. */
export function useStages(opportunityId: string) {
  return useQuery({
    queryKey: queryKeys.stages(opportunityId),
    queryFn: () => api.stages(opportunityId),
    // O estado depende de quase tudo no dossiê: confere de novo ao voltar à janela.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 20_000,
  });
}
