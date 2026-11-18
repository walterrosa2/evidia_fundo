import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "./api";

/** Usuário da sessão operacional; compartilha o cache com a casca das telas. */
export function useOperationalUser() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me, retry: false }).data;
}
