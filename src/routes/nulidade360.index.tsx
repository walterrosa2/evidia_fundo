import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShieldAlert, FileSearch, AlertOctagon, Activity } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { getCaseDetail } from "@/data/mockCaseDetail";
import { mockDeals } from "@/data/mockDeals";

export const Route = createFileRoute("/nulidade360/")({
  component: Nulidade360,
});

const riskLevelMap = {
  low: "baixo",
  moderate: "moderado",
  high: "alto",
  critical: "critico",
} as const;

function Nulidade360() {
  const { selectedCaseId, selectedDeal, selectedCase, selectCase } = useCaseSelection();
  const selectedDetail = getCaseDetail(selectedCaseId)!;
  const selectedBlocks = selectedCase.auditBlocks.map((block, index) => {
    const findings = selectedCase.findings.filter((finding) =>
      block.findingIds.includes(finding.id),
    );
    const confidence =
      findings.length > 0
        ? Math.round(
            (findings.reduce((sum, finding) => sum + finding.confidence, 0) / findings.length) *
              100,
          )
        : 0;

    return {
      ...block,
      code: `B${String(index + 1).padStart(2, "0")}`,
      risk: riskLevelMap[block.riskLevel],
      riskScore: Math.round(100 - block.integrityScore),
      confidence,
      findingsCount: findings.length,
    };
  });

  return (
    <AppShell context={`Nulidade360 · ${selectedDeal.name}`}>
      <SectionHeader
        eyebrow={`Módulo EvidIA · ${selectedDeal.name}`}
        title="Nulidade360"
        subtitle="Audite laudos, perícias e provas técnicas por blocos. O processo selecionado acima permanece ativo nas próximas etapas."
        actions={
          <Link
            to="/nulidade360/nova-analise"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" /> Nova análise de laudo
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Documentos analisados"
          value={selectedDetail.documentsAnalyzed}
          icon={FileSearch}
          accent="cyan"
        />
        <MetricCard
          label="Blocos auditados"
          value={selectedBlocks.length}
          icon={Activity}
          accent="violet"
        />
        <MetricCard
          label="Achados mapeados"
          value={selectedDeal.sourceFindingCount}
          icon={AlertOctagon}
          accent="risk-critical"
        />
        <MetricCard
          label="Score de risco"
          value={`${selectedDeal.evidiaScore}/100`}
          icon={ShieldAlert}
          accent="risk-high"
          hint={selectedDeal.evidenceRisk}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="text-sm font-semibold">Mapa de risco por bloco</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Processo selecionado: {selectedDeal.name}
        </div>
        {selectedBlocks.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {selectedBlocks.map((block) => (
              <Link
                key={block.id}
                to="/nulidade360/blocos"
                className="block rounded-lg border border-border bg-surface p-4 transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {block.code}
                  </div>
                  <RiskBadge level={block.risk} />
                </div>
                <div className="mt-2 font-medium">{block.name}</div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Risco <b className="text-foreground">{block.riskScore}</b>
                  </span>
                  <span>Conf. {block.confidence}%</span>
                  <span>{block.findingsCount} achados</span>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${block.riskScore}%`,
                      background: `var(--risk-${block.risk === "critico" ? "critical" : block.risk === "alto" ? "high" : block.risk === "moderado" ? "moderate" : "low"})`,
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-border bg-surface/40 p-5 text-sm text-muted-foreground">
            Os blocos detalhados ainda não foram vinculados a este processo. O score consolidado foi
            preservado, mas a abertura por bloco depende da documentação de origem.
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <div className="text-sm font-semibold">Processos disponíveis</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Selecione um processo para abrir o detalhe ou use o seletor acima para manter a etapa
            atual.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface/40">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Caso</th>
                <th className="px-6 py-3 font-medium">Documentos</th>
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Risco</th>
                <th className="px-6 py-3 font-medium">Seleção</th>
              </tr>
            </thead>
            <tbody>
              {mockDeals.map((deal) => {
                const detail = getCaseDetail(deal.id)!;
                const selected = deal.id === selectedCaseId;
                return (
                  <tr
                    key={deal.id}
                    className={`border-b border-border/40 ${selected ? "bg-primary/5" : "hover:bg-secondary/30"}`}
                  >
                    <td className="px-6 py-3">
                      <Link
                        to="/deals/$id"
                        params={{ id: deal.id }}
                        onClick={() => selectCase(deal.id)}
                        className="font-medium hover:text-primary"
                      >
                        #{deal.rankingPosition} · {deal.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{detail.documentsAnalyzed}</td>
                    <td className="px-6 py-3 tabular-nums">{deal.evidiaScore}</td>
                    <td className="px-6 py-3">
                      <RiskBadge level={deal.evidenceRisk} />
                    </td>
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectCase(deal.id)}
                        className={`rounded-md border px-3 py-1.5 text-xs transition ${
                          selected
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        {selected ? "Selecionado" : "Usar neste módulo"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
