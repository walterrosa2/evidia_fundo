import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BriefcaseBusiness, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { mockDeals, purchaseProfileLabel } from "@/data/mockDeals";

const contextualRoutes = [
  "/deals/",
  "/nulidade360",
  "/red-team",
  "/valuation",
  "/relatorios/investment-memo",
];

function getDealIdFromPathname(pathname: string) {
  if (!pathname.startsWith("/deals/")) return null;
  const caseId = pathname.split("/")[2];
  return mockDeals.some((deal) => deal.id === caseId) ? caseId : null;
}

export function CaseContextBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { selectedCaseId, selectedDeal, selectCase } = useCaseSelection();
  const routeCaseId = getDealIdFromPathname(pathname);
  const activeDeal = mockDeals.find((deal) => deal.id === routeCaseId) ?? selectedDeal;
  const isContextualRoute = contextualRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (routeCaseId && routeCaseId !== selectedCaseId) selectCase(routeCaseId);
  }, [routeCaseId, selectCase, selectedCaseId]);

  if (!isContextualRoute) return null;

  const handleChange = (caseId: string) => {
    selectCase(caseId);
    if (pathname.startsWith("/deals/")) {
      void navigate({ to: "/deals/$id", params: { id: caseId } });
    }
  };

  const stageLinks = [
    {
      label: "Caso",
      to: "/deals/$id",
      params: { id: activeDeal.id },
      active: pathname.startsWith("/deals/"),
    },
    { label: "Nulidade360", to: "/nulidade360", active: pathname.startsWith("/nulidade360") },
    { label: "Red Team", to: "/red-team", active: pathname.startsWith("/red-team") },
    { label: "Valuation", to: "/valuation", active: pathname.startsWith("/valuation") },
    {
      label: "Memo",
      to: "/relatorios/investment-memo",
      active: pathname.startsWith("/relatorios/investment-memo"),
    },
  ] as const;

  return (
    <section className="mb-6 rounded-xl border border-primary/25 bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <BriefcaseBusiness className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Processo em análise
            </div>
            <Select value={activeDeal.id} onValueChange={handleChange}>
              <SelectTrigger
                aria-label="Selecionar processo em análise"
                className="mt-1 h-10 w-full max-w-xl border-border bg-surface text-sm font-medium"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-w-[calc(100vw-2rem)]">
                <SelectGroup>
                  <SelectLabel className="text-xs text-muted-foreground">
                    Processos disponíveis
                  </SelectLabel>
                  {mockDeals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id} className="py-2.5">
                      <span className="mr-1 font-semibold text-primary">
                        #{deal.rankingPosition}
                      </span>
                      {deal.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="hidden shrink-0 text-right lg:block">
            <div className="text-xs font-medium text-primary">
              Perfil {purchaseProfileLabel[activeDeal.purchaseProfile]}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {activeDeal.processNumber ?? "Número a confirmar"}
            </div>
          </div>
        </div>

        <nav aria-label="Etapas do processo" className="flex flex-wrap gap-1.5">
          {stageLinks.map((stage) => (
            <Link
              key={stage.label}
              to={stage.to}
              params={"params" in stage ? stage.params : undefined}
              onClick={() => selectCase(activeDeal.id)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition ${
                stage.active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {stage.active ? <Check className="size-3.5" /> : null}
              {stage.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground xl:ml-12">
        O processo escolhido permanece ativo ao navegar entre Casos, Nulidade360, Red Team,
        Valuation e Investment Memo.
      </p>
    </section>
  );
}
