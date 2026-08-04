import { Fingerprint, Microscope, ShieldAlert, UserCheck } from "lucide-react";
import { intelligenceModules } from "@/data/pipelineDemo";

const icons = [ShieldAlert, Fingerprint, Microscope, UserCheck];

export function IntelligenceModules() {
  return (
    <section className="rounded-2xl border border-violet/30 bg-gradient-to-br from-violet/10 to-card p-6 sm:p-8">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-violet">Camada de análise</div>
        <h2 className="mt-2 text-2xl font-semibold">Motores de inteligência EvidIA</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Quatro motores conectados analisam o mesmo conjunto documental sob perspectivas
          complementares.
        </p>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {intelligenceModules.map(([title, description, metric], index) => {
          const Icon = icons[index];
          return (
            <article
              key={title}
              className="group rounded-xl border border-border bg-background/50 p-4 transition hover:border-violet/50 hover:bg-violet/5"
            >
              <Icon className="size-5 text-violet" />
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              <div className="mt-4 font-mono text-xs text-violet">{metric}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
