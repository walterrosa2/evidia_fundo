import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords, ShieldCheck, TrendingUp, ArrowRight, FileWarning } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { getRedTeamData } from "@/data/mockRedTeam";

export const Route = createFileRoute("/red-team")({
  component: RedTeam,
});

const severityColor = {
  moderado: "var(--risk-moderate)",
  alto: "var(--risk-high)",
  critico: "var(--risk-critical)",
} as const;

function RedTeam() {
  const { selectedDeal } = useCaseSelection();
  const data = getRedTeamData(selectedDeal.id);

  return (
    <AppShell context={`Red Team · ${selectedDeal.name}`}>
      <SectionHeader
        eyebrow={`Simulação adversarial · ${selectedDeal.name}`}
        title="Como a parte contrária atacaria seu caso"
        subtitle="A EvidIA opera como advogado da outra parte. Troque o processo no seletor acima sem perder a etapa atual."
        actions={
          <Link
            to="/valuation"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ver impacto no valuation <ArrowRight className="size-4" />
          </Link>
        }
      />

      {data.available ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {data.attacks.map((attack) => (
              <div key={attack.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="grid size-9 place-items-center rounded-md border border-border"
                      style={{ color: severityColor[attack.severity] }}
                    >
                      <Swords className="size-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{attack.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{attack.vector}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Êxito estimado
                    </div>
                    <div
                      className="text-xl font-semibold tabular-nums"
                      style={{ color: severityColor[attack.severity] }}
                    >
                      {attack.successProbability}%
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${attack.successProbability}%`,
                      background: severityColor[attack.severity],
                    }}
                  />
                </div>
                <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                  <ShieldCheck className="mr-1 inline size-3.5 text-primary" />
                  <span className="text-foreground/90">Mitigação:</span> {attack.mitigation}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">Vulnerabilidades ocultas</div>
              <ul className="mt-3 space-y-2 text-sm">
                {data.hiddenVulnerabilities.map((vulnerability) => (
                  <li key={vulnerability} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-risk-critical" />
                    <span className="text-foreground/90">{vulnerability}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-violet/10 to-cyan/5 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-primary" /> Impacto na tese de investimento
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                {data.investmentThesisImpact}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
            <FileWarning className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Red Team ainda não disponível</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            {data.investmentThesisImpact}
          </p>
          <Link
            to="/deals/$id"
            params={{ id: selectedDeal.id }}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm hover:border-primary/40 hover:text-primary"
          >
            Voltar ao caso <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </AppShell>
  );
}
