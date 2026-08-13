import { useState } from "react";
import { ChevronDown, FileText, Scale, Target, TriangleAlert } from "lucide-react";
import { NULLITY_PILLARS, type NullityFinding } from "@/data/v2/nullityReports";
import { HelpHint } from "@/components/shared/HelpHint";
import { FIELD_HELP } from "@/config/fieldHelp";

const LEVEL_COLOR = {
  low: "var(--risk-low)",
  moderate: "var(--risk-moderate)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
} as const;

const LEVEL_LABEL = {
  low: "Baixo",
  moderate: "Moderado",
  high: "Alto",
  critical: "Crítico",
} as const;

/** Formata rótulos vindos do parecer em snake_case. */
function humanize(value: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const STRATEGIC_TONE: Record<string, string> = {
  critico: "text-risk-critical",
  alto: "text-risk-high",
  moderado: "text-risk-moderate",
  baixo: "text-muted-foreground",
};

export function FindingSheet({ finding }: { finding: NullityFinding }) {
  const [open, setOpen] = useState(false);
  const pillar = NULLITY_PILLARS.find((item) => item.id === finding.pillar);
  const color = LEVEL_COLOR[finding.riskLevel];

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-5 text-left transition hover:bg-secondary/25"
      >
        <span
          className="mt-1 h-full w-1 shrink-0 self-stretch rounded-full"
          style={{ background: color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-[11px] font-semibold text-primary">
              {finding.pillar}
            </span>
            <span className="text-[11px] text-muted-foreground">{pillar?.name}</span>
            <span
              className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
              style={{ borderColor: `${color}55`, color }}
            >
              {LEVEL_LABEL[finding.riskLevel]}
            </span>
            {finding.score !== null && (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                score <b className="text-foreground">{finding.score.toFixed(0)}</b>
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-medium leading-snug">
            <span className="mr-1.5 tabular-nums text-muted-foreground">{finding.index}.</span>
            {finding.question}
          </h3>
          {!open && finding.inference && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {finding.inference}
            </p>
          )}
        </div>
        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Camada 1 — o vício */}
          <Layer icon={Scale} title="Vício" tone="var(--violet)">
            <Field label="Fundamento jurídico" value={finding.legalBasis} />
            <Field
              help={FIELD_HELP.deverViolado}
              label="Dever violado"
              value={finding.breachedDuty}
            />
            <Field help={FIELD_HELP.atoAfetado} label="Ato afetado" value={finding.affectedAct} />
            <Field label="Categoria" value={humanize(finding.category)} />
            <Field label="Natureza do vício" value={humanize(finding.defectNature)} />
          </Layer>

          {/* Camada 2 — a consequência */}
          <Layer icon={TriangleAlert} title="Consequência" tone="var(--gold)">
            <Field label="Inferência" value={finding.inference} block />
            <Field help={FIELD_HELP.prejuizo} label="Prejuízo" value={finding.prejudice} block />
            <Field
              help={FIELD_HELP.nexoCausal}
              label="Nexo causal"
              value={finding.causalLink}
              block
            />
            <Field label="Impacto processual" value={finding.proceduralImpact} block />
          </Layer>

          {/* Camada 3 — a ação */}
          <Layer icon={Target} title="Ação" tone="var(--cyan)">
            <Field label="Estratégia" value={finding.strategy} block />
            <Field label="Ação recomendada" value={finding.recommendedAction} block />
          </Layer>

          {/* Selos de classificação */}
          <div className="grid grid-cols-2 gap-3 border-t border-border bg-surface/40 px-5 py-4 sm:grid-cols-4">
            <Seal
              label="Força da evidência"
              help={FIELD_HELP.forcaEvidencia}
              value={humanize(finding.evidenceStrength)}
            />
            <Seal
              label="Suporte no mapa"
              help={FIELD_HELP.suporteMapa}
              value={humanize(finding.evidenceMapSupport)}
            />
            <Seal
              label="Valor estratégico"
              help={FIELD_HELP.valorEstrategico}
              value={humanize(finding.strategicValue)}
              tone={STRATEGIC_TONE[finding.strategicValue]}
            />
            <Seal
              label="Risco de preclusão"
              help={FIELD_HELP.riscoPreclusao}
              value={humanize(finding.preclusionRisk)}
            />
          </div>

          {/* Evidências */}
          {(finding.evidences.length > 0 || finding.evidenceNotes) && (
            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <FileText className="size-3.5" /> Evidências mapeadas
              </div>
              {finding.evidenceNotes && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {finding.evidenceNotes}
                </p>
              )}
              {finding.evidences.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {finding.evidences.map((evidence) => (
                    <li
                      key={`${evidence.page}-${evidence.excerpt.slice(0, 24)}`}
                      className="rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <div className="text-[10px] tabular-nums text-primary">
                        Página {evidence.page}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                        {evidence.excerpt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Layer({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Scale;
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border px-5 py-4">
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: tone }}
      >
        <Icon className="size-3.5" /> {title}
      </div>
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </div>
  );
}

function Field({
  label,
  value,
  block,
  help,
}: {
  label: string;
  value: string;
  block?: boolean;
  help?: string;
}) {
  if (!value) return null;
  return (
    <div className={block ? "" : "flex flex-wrap items-baseline gap-x-2"}>
      <dt className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {help && <HelpHint label={label} text={help} />}
      </dt>
      <dd className={`text-xs leading-relaxed text-foreground/90 ${block ? "mt-1" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Seal({
  label,
  value,
  tone,
  help,
}: {
  label: string;
  value: string;
  tone?: string;
  help?: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {help && <HelpHint label={label} text={help} />}
      </div>
      <div className={`mt-0.5 text-xs font-medium ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
