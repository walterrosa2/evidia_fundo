import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";

export function PipelineCTA() {
  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-violet/10 to-risk-low/10 p-8 text-center sm:p-12">
      <div className="text-xs uppercase tracking-[0.2em] text-primary">Decisão verificável</div>
      <h2 className="mt-3 text-3xl font-semibold">
        A EvidIA não substitui a decisão do investidor.
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
        Ela transforma um processo complexo numa decisão verificável.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Iniciar demonstração <ArrowRight className="size-4" />
        </Link>
        <a
          href="#pipeline"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm hover:bg-secondary"
        >
          <RotateCcw className="size-4" /> Rever o pipeline
        </a>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Explore um caso real estruturado pela EvidIA.
      </p>
    </section>
  );
}
