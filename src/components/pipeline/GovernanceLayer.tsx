import { Database, GitBranch, Scale, UserCheck } from "lucide-react";
import { governancePillars } from "@/data/pipelineDemo";

const icons = [Database, Scale, GitBranch, UserCheck];

export function GovernanceLayer() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-risk-low/25 bg-risk-low/5 p-6 sm:p-8">
      <div className="text-xs uppercase tracking-[0.2em] text-risk-low">Camada transversal</div>
      <h2 className="mt-2 text-2xl font-semibold">Governança, explicabilidade e revisão humana</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Toda conclusão deve ser verificável, explicável e ligada à sua fonte.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {governancePillars.map(([title, description], index) => {
          const Icon = icons[index];
          return (
            <div key={title} className="rounded-lg border border-border bg-background/40 p-4">
              <Icon className="size-4 text-risk-low" />
              <div className="mt-3 text-sm font-medium">{title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {["Dados públicos", "Scores simulados", "Sem decisão jurídica automática"].map((item) => (
          <span key={item} className="rounded-full border border-border px-3 py-1">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
