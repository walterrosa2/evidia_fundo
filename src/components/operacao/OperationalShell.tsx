import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { api, ApiError, queryKeys } from "@/lib/operacao/api";
import { ErrorNotice, Loading } from "./primitives";

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  analyst: "Analista",
  reviewer: "Revisor",
  viewer: "Leitor",
};

/**
 * Casca das telas operacionais. Diferente da casca da demonstração: não exibe caso
 * demonstrativo, usuário fictício nem métricas simuladas. Exige sessão real.
 */
export function OperationalShell({
  context,
  children,
}: {
  context: string;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: queryKeys.me, queryFn: api.me, retry: false });

  const unauthenticated = session.error instanceof ApiError && session.error.isUnauthenticated;
  useEffect(() => {
    if (unauthenticated) navigate({ to: "/operacao/login" });
  }, [unauthenticated, navigate]);

  const logout = useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ["operacao"] });
      navigate({ to: "/operacao/login" });
    },
  });

  return (
    <div className="flex min-h-screen">
      <a
        href="#conteudo-operacao"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Ir para o conteúdo
      </a>
      <Sidebar />
      {mobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar navegação"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar mobile onNavigate={() => setMobileNavOpen(false)} />
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Abrir navegação"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-surface hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          >
            <Menu aria-hidden="true" className="size-4" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-medium text-primary">
              Operação
            </span>
            <span className="opacity-50">/</span>
            <span className="truncate">{context}</span>
          </div>
          {session.data && (
            <div className="ml-auto flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 text-right leading-tight sm:block">
                <div className="truncate text-sm font-medium">{session.data.display_name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {roleLabel[session.data.role] ?? session.data.role} ·{" "}
                  {session.data.organization_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Sair
              </button>
            </div>
          )}
        </header>
        <main
          id="conteudo-operacao"
          className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 md:p-8"
        >
          {session.isPending && <Loading label="Verificando sessão…" />}
          {session.isError && !unauthenticated && (
            <ErrorNotice error={session.error} onRetry={() => session.refetch()} />
          )}
          {session.data && children}
        </main>
      </div>
    </div>
  );
}
