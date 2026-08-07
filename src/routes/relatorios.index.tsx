import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { investmentMemos } from "@/data/mockInvestmentMemos";
import { mockDeals, purchaseProfileLabel } from "@/data/mockDeals";

export const Route = createFileRoute("/relatorios/")({
  component: Relatorios,
});

const dealById = new Map(mockDeals.map((deal) => [deal.id, deal]));

function Relatorios() {
  const { selectedCaseId, selectCase } = useCaseSelection();

  return (
    <AppShell context="Relatórios">
      <SectionHeader
        eyebrow={`Comitê de investimento · ${investmentMemos.length} processos`}
        title="Relatórios"
        subtitle="Investment Memos dos processos atualmente analisados pela EvidIA. Abra um item para consultar o conteúdo específico daquele caso."
      />
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {investmentMemos.map((memo) => {
          const deal = dealById.get(memo.caseId)!;
          const selected = selectedCaseId === memo.caseId;

          return (
            <div
              key={memo.caseId}
              className={`flex flex-col gap-4 px-5 py-4 transition sm:flex-row sm:items-center sm:justify-between ${
                selected ? "bg-primary/5" : "hover:bg-secondary/20"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-md border border-border text-primary">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{memo.title}</div>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                        memo.status === "Pronto"
                          ? "border-risk-low/30 bg-risk-low/10 text-risk-low"
                          : "border-violet/30 bg-violet/10 text-violet"
                      }`}
                    >
                      {memo.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {memo.date} · {memo.version} · #{deal.rankingPosition} · Perfil{" "}
                    {purchaseProfileLabel[deal.purchaseProfile]}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                    {deal.processNumber ?? "Número do processo a confirmar"}
                  </div>
                </div>
              </div>
              <Link
                to="/relatorios/investment-memo"
                onClick={() => selectCase(memo.caseId)}
                className="inline-flex shrink-0 items-center gap-1 self-end text-sm text-primary hover:underline sm:self-auto"
              >
                Abrir <ArrowRight className="size-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
