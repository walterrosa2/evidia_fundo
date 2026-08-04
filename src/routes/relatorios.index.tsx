import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { caseDetail } from "@/data/mockCaseDetail";

export const Route = createFileRoute("/relatorios/")({
  component: Relatorios,
});

const reports = [
  {
    id: "memo",
    title: `Investment Memo — ${caseDetail.name}`,
    date: "28/07/2026",
    version: "v1.3",
    status: "Pronto",
    available: true,
  },
  {
    id: "memo-aurora",
    title: "Memo executivo — Aurora × Norte",
    date: "18/05/2026",
    version: "v0.9",
    status: "Rascunho",
    available: false,
  },
  {
    id: "memo-xpto",
    title: "Investment Memo — XPTO × Beta",
    date: "15/05/2026",
    version: "v2.1",
    status: "Aprovado",
    available: false,
  },
];

function Relatorios() {
  return (
    <AppShell context="Relatórios">
      <SectionHeader
        eyebrow="Comitê de investimento"
        title="Relatórios"
        subtitle="Investment Memos gerados pela EvidIA para apresentação ao comitê."
      />
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md border border-border text-primary">
                <FileText className="size-4" />
              </div>
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {r.date} · {r.version} · {r.status}
                </div>
              </div>
            </div>
            {r.available ? (
              <Link
                to="/relatorios/investment-memo"
                className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
              >
                Abrir <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Indisponível na demonstração</span>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
