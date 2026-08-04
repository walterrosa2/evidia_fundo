import { useState } from "react";
import { FileText } from "lucide-react";
import { pipelineStages, outputs, type PipelineStageData } from "@/data/pipelineDemo";
import { PipelineStage } from "./PipelineStage";
import { PipelineDetailsSheet } from "./PipelineDetailsSheet";
import { IntelligenceModules } from "./IntelligenceModules";
import { GovernanceLayer } from "./GovernanceLayer";
import { PipelineCTA } from "./PipelineCTA";

export function PipelineOverview() {
  const [selected, setSelected] = useState<PipelineStageData | null>(null);
  return (
    <main id="pipeline" className="mx-auto max-w-[1440px] space-y-10 px-5 py-12 sm:px-8 lg:px-12">
      <section>
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.2em] text-primary">Pipeline principal</div>
          <h2 className="mt-2 text-3xl font-semibold">
            Seis etapas. Uma linha contínua de evidência.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Clique em qualquer etapa para entender os dados utilizados e o resultado produzido.
          </p>
        </div>
        <div className="relative mt-8">
          <div className="pipeline-track absolute left-5 top-0 h-full w-px lg:left-0 lg:top-5 lg:h-px lg:w-full" />
          <div className="relative grid gap-4 pl-8 sm:grid-cols-2 lg:grid-cols-6 lg:pl-0">
            {pipelineStages.map((stage) => (
              <PipelineStage key={stage.id} stage={stage} onOpen={() => setSelected(stage)} />
            ))}
          </div>
        </div>
      </section>
      <IntelligenceModules />
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="text-xs uppercase tracking-[0.2em] text-primary">Saídas da plataforma</div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {outputs.map((item) => (
            <div key={item} className="rounded-lg border border-border bg-surface p-3">
              <FileText className="size-4 text-primary" />
              <div className="mt-3 text-xs font-medium">{item}</div>
            </div>
          ))}
        </div>
      </section>
      <GovernanceLayer />
      <section className="rounded-xl border border-risk-moderate/30 bg-risk-moderate/5 p-5 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Aviso da demonstração:</strong> baseada em documentos
        públicos. Scores, probabilidades e valuation são simulados. Não constitui parecer jurídico
        ou recomendação de investimento.
      </section>
      <PipelineCTA />
      <PipelineDetailsSheet stage={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
