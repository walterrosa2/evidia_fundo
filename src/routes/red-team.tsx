import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords, ShieldCheck, TrendingUp, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { redTeamAttacks, hiddenVulnerabilities, investmentThesisImpact } from "@/data/mockRedTeam";
import { caseDetail } from "@/data/mockCaseDetail";

export const Route = createFileRoute("/red-team")({
  component: RedTeam,
});

const sevColor = {
  moderado: "var(--risk-moderate)",
  alto: "var(--risk-high)",
  critico: "var(--risk-critical)",
} as const;

function RedTeam() {
  return (
    <AppShell context="Red Team Jurídico">
      <SectionHeader
        eyebrow={`Simulação adversarial · ${caseDetail.name}`}
        title="Como a parte contrária atacaria seu caso"
        subtitle="A EvidIA opera como advogado da outra parte: mapeia ataques prováveis, calcula probabilidade de êxito e propõe mitigações antes do aporte."
        actions={
          <Link
            to="/valuation"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ver impacto no valuation <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {redTeamAttacks.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-9 place-items-center rounded-md border border-border"
                    style={{ color: sevColor[a.severity] }}
                  >
                    <Swords className="size-4" />
                  </div>
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.vector}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Êxito estimado
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: sevColor[a.severity] }}
                  >
                    {a.successProbability}%
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${a.successProbability}%`, background: sevColor[a.severity] }}
                />
              </div>
              <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <ShieldCheck className="inline size-3.5 mr-1 text-primary" />
                <span className="text-foreground/90">Mitigação:</span> {a.mitigation}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">Vulnerabilidades ocultas</div>
            <ul className="mt-3 space-y-2 text-sm">
              {hiddenVulnerabilities.map((v) => (
                <li key={v} className="flex gap-2">
                  <span className="text-risk-critical mt-1.5 size-1.5 rounded-full bg-risk-critical shrink-0" />
                  <span className="text-foreground/90">{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-gradient-to-br from-violet/10 to-cyan/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" /> Impacto na tese de investimento
            </div>
            <p className="mt-3 text-sm text-foreground/90 leading-relaxed">
              {investmentThesisImpact}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
