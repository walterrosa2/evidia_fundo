import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { blocks, mockFindings } from "@/data/mockFindings";
import { FileText, Layers, Search, Swords } from "lucide-react";
import { caseDetail } from "@/data/mockCaseDetail";

export const Route = createFileRoute("/nulidade360/resultado")({
  component: Resultado,
});

function Resultado() {
  const overall = 52;
  const ctas = [
    { to: "/nulidade360/blocos", label: "Análise detalhada por bloco", icon: Layers },
    { to: "/nulidade360/evidencias", label: "Ver evidências", icon: Search },
    { to: "/red-team", label: "Red Team adversarial", icon: Swords },
    { to: "/relatorios/investment-memo", label: "Investment Memo", icon: FileText },
  ] as const;

  return (
    <AppShell context="Nulidade360 · Resultado">
      <SectionHeader
        eyebrow={`Resultado executivo · ${caseDetail.name}`}
        title="Reprecificar — risco probatório alto"
        subtitle="A EvidIA identificou fragilidades estruturais que justificam ajuste no preço de entrada. Recomendação suportada por achados em B1, B2 e B4."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center">
          <ScoreRing value={overall} size={170} />
          <div className="mt-4 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Recomendação
            </div>
            <div className="mt-1 text-lg font-semibold text-risk-moderate">Reprecificar</div>
            <div className="mt-1 text-xs text-muted-foreground max-w-[16rem]">
              Reduzir ticket em 10–15% e provocar complementação pericial preventiva.
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">Mapa de risco por bloco</div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {blocks.map((b) => (
              <div key={b.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {b.code}
                  </div>
                  <RiskBadge level={b.risk} />
                </div>
                <div className="mt-1 text-sm font-medium leading-tight">{b.name}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Score <b className="text-foreground">{b.score}</b>
                  </span>
                  <span>{b.findingsCount} achados</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="text-sm font-semibold">Principais achados</div>
          <ul className="mt-4 space-y-3">
            {mockFindings.slice(0, 5).map((f) => (
              <li key={f.id} className="rounded-md border border-border bg-surface px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium">{f.question}</div>
                  <RiskBadge level={f.riskLevel} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{f.inference}</div>
                <div className="mt-2 text-[11px] text-primary">Impacto: {f.proceduralImpact}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm font-semibold">Composição do score</div>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { k: "Cadeia de custódia", w: 25, v: 38 },
              { k: "Metodologia", w: 20, v: 52 },
              { k: "Contraditório", w: 20, v: 47 },
              { k: "Documentação", w: 15, v: 64 },
              { k: "Sentença viciada", w: 10, v: 49 },
              { k: "Suspeição", w: 10, v: 71 },
            ].map((r) => (
              <li key={r.k}>
                <div className="flex items-center justify-between text-xs">
                  <span>{r.k}</span>
                  <span className="text-muted-foreground">
                    peso {r.w}% · {r.v}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                    style={{ width: `${r.v}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ctas.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition"
          >
            <div className="grid size-9 place-items-center rounded-md border border-border text-primary">
              <c.icon className="size-4" />
            </div>
            <div className="text-sm font-medium">{c.label}</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
