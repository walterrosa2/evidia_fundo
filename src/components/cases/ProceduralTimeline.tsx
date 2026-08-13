import { useMemo, useState } from "react";
import {
  CalendarClock,
  FileSignature,
  Gavel,
  Landmark,
  Microscope,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import type { ProceduralActType, TimelineEvent } from "@/data/v2";
import { HelpHint } from "@/components/shared/HelpHint";
import {
  ACTOR_LABEL,
  ACT_FAMILY,
  ACT_TYPE_LABEL,
  FAMILY_COLOR,
  calculateTimelineMetrics,
} from "@/lib/timelineAnalytics";

const FAMILY_LABEL = {
  postulatoria: "Postulatória",
  pericial: "Prova pericial",
  decisoria: "Decisória",
  contexto: "Contexto",
} as const;

const FAMILY_ICON = {
  postulatoria: ScrollText,
  pericial: Microscope,
  decisoria: Gavel,
  contexto: Landmark,
} as const;

type Family = keyof typeof FAMILY_LABEL;

function formatDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function familyOf(event: TimelineEvent): Family {
  return ACT_FAMILY[event.actType ?? "peticao"];
}

export function ProceduralTimeline({
  events,
  filingDate,
}: {
  events: TimelineEvent[];
  filingDate?: string;
}) {
  const [onlyMilestones, setOnlyMilestones] = useState(true);
  const [family, setFamily] = useState<Family | "todos">("todos");

  const metrics = useMemo(() => calculateTimelineMetrics(events, filingDate), [events, filingDate]);

  const visible = useMemo(() => {
    return [...events]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((event) => (onlyMilestones ? event.relevance !== "ordinario" : true))
      .filter((event) => (family === "todos" ? true : familyOf(event) === family));
  }, [events, onlyMilestones, family]);

  const byYear = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const event of visible) {
      const year = event.date.slice(0, 4);
      groups.set(year, [...(groups.get(year) ?? []), event]);
    }
    return [...groups.entries()];
  }, [visible]);

  const availableFamilies = useMemo(() => {
    const present = new Set<Family>(events.map(familyOf));
    return (Object.keys(FAMILY_LABEL) as Family[]).filter((item) => present.has(item));
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-primary" /> Cronologia processual
        </div>
        <div className="mt-5 rounded-lg border border-dashed border-border bg-surface/40 p-4 text-sm text-muted-foreground">
          Cronologia pendente. A movimentação primária ainda precisa ser confirmada nos autos antes
          de sustentar leitura de duration.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-primary" /> Cronologia processual
          <HelpHint
            label="cronologia processual"
            text="O que é: a sequência de atos extraída dos autos, classificada por tipo, autor e fase. Como é montada: cada evento aponta a página de origem no documento processado. Como ler: marcos estruturam a leitura; a visão completa expõe o ritmo real do rito e os intervalos sem movimentação, que determinam duration e custo de carrego."
          />
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          {visible.length} de {metrics.total} atos
        </div>
      </div>

      {/* Métricas derivadas */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Duration"
          help="O que é: o tempo decorrido entre a distribuição desta ação e o último ato registrado. Como ler: é o principal insumo do custo de carrego — quanto maior, mais capital fica imobilizado."
          value={metrics.durationYears !== null ? `${metrics.durationYears.toFixed(1)} anos` : "—"}
          hint={metrics.filingDate ? `desde ${formatDate(metrics.filingDate)}` : undefined}
        />
        <Metric
          label="Último ato"
          help="O que é: há quantos dias o processo não registra movimentação. Como ler: silêncio prolongado indica risco de alongamento adicional."
          value={metrics.daysSinceLastAct !== null ? `há ${metrics.daysSinceLastAct} dias` : "—"}
          hint={metrics.lastActDate ? formatDate(metrics.lastActDate) : undefined}
        />
        <Metric
          label="Maior hiato"
          help="O que é: o maior intervalo sem movimentação desde a distribuição. Como ler: hiatos longos revelam gargalos estruturais do rito, não eventos isolados."
          value={metrics.longestGap ? `${metrics.longestGap.days} dias` : "—"}
          hint={
            metrics.longestGap
              ? `após ${metrics.longestGap.afterTitle.toLocaleLowerCase("pt-BR")}`
              : undefined
          }
          alert={Boolean(metrics.longestGap && metrics.longestGap.days > 540)}
        />
        <Metric
          help="O que é: quantos atos da cronologia pertencem à fase de prova técnica. Como ler: concentração alta indica ativo cujo desfecho depende da perícia."
          label="Atos periciais"
          value={String(metrics.expertActs)}
          hint="do total mapeado"
        />
      </div>

      {/* Iniciativa processual */}
      {metrics.byActor.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wider">Iniciativa</span>
          {metrics.byActor.map(({ actor, count }) => (
            <span key={actor} className="tabular-nums">
              {ACTOR_LABEL[actor]} <b className="text-foreground">{count}</b>
            </span>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setOnlyMilestones((value) => !value)}
          aria-pressed={onlyMilestones}
          className={`rounded-md border px-3 py-1.5 text-xs transition ${
            onlyMilestones
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          {onlyMilestones ? "Somente marcos" : "Cronologia completa"}
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <FilterChip active={family === "todos"} onClick={() => setFamily("todos")}>
          Todos
        </FilterChip>
        {availableFamilies.map((item) => (
          <FilterChip key={item} active={family === item} onClick={() => setFamily(item)}>
            <span
              className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
              style={{ background: FAMILY_COLOR[item] }}
            />
            {FAMILY_LABEL[item]}
          </FilterChip>
        ))}
      </div>

      {/* Eventos */}
      <div className="mt-5 space-y-6">
        {byYear.map(([year, yearEvents]) => (
          <div key={year}>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-semibold tabular-nums text-primary">{year}</span>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {yearEvents.length} {yearEvents.length === 1 ? "ato" : "atos"}
              </span>
            </div>
            <ol className="ml-1 space-y-3 border-l border-border">
              {yearEvents.map((event) => {
                const fam = familyOf(event);
                const Icon = FAMILY_ICON[fam];
                const isMilestone = event.relevance === "marco";
                return (
                  <li key={`${event.date}-${event.title}`} className="relative pl-6">
                    <span
                      className="absolute -left-[7px] top-1 grid size-3.5 place-items-center rounded-full border-2 border-card"
                      style={{ background: FAMILY_COLOR[fam] }}
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(event.date)}
                      </span>
                      {event.actType && (
                        <span
                          className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
                          style={{
                            borderColor: `${FAMILY_COLOR[fam]}55`,
                            color: FAMILY_COLOR[fam],
                          }}
                        >
                          <Icon className="size-3" />
                          {ACT_TYPE_LABEL[event.actType as ProceduralActType]}
                        </span>
                      )}
                      {event.actor && (
                        <span className="text-[10px] text-muted-foreground">
                          {ACTOR_LABEL[event.actor]}
                        </span>
                      )}
                    </div>
                    <div
                      className={`mt-0.5 text-sm ${isMilestone ? "font-medium" : "text-foreground/85"}`}
                    >
                      {event.title}
                    </div>
                    {event.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    {event.source && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <FileSignature className="size-3" />
                        <span>{event.source.documentLabel}</span>
                        <span className="tabular-nums">· p. {event.source.sourcePage}</span>
                        {event.source.excerpt && (
                          <span className="italic">“{event.source.excerpt}”</span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="mt-5 rounded-lg border border-dashed border-border bg-surface/40 p-4 text-sm text-muted-foreground">
          Nenhum ato corresponde ao filtro selecionado.
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-surface text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  hint,
  alert,
  help,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
  help?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {help && <HelpHint label={label} text={help} />}
      </div>
      <div
        className={`mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums ${alert ? "text-risk-moderate" : ""}`}
      >
        {alert && <TriangleAlert className="size-3.5 shrink-0" />}
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
