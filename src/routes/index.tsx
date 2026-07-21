import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-risk-low animate-pulse" />
          Investor Demo · Maio 2026
        </div>
        <h1 className="mt-8 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          O fundo que analisa <br />
          <span className="text-gradient">melhor, compra melhor.</span>
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
          EvidIA é a plataforma de inteligência probatória, auditoria processual e
          valuation litigioso para fundos de investimento em ativos judiciais.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Entrar na demonstração
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-secondary transition"
          >
            Acesso direto ao dashboard →
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            { k: "Nulidade360", v: "Auditoria pericial por blocos de risco — custódia, metodologia, contraditório." },
            { k: "Red Team Jurídico", v: "Simulação adversarial automática: como a parte contrária atacaria seu caso." },
            { k: "Valuation Probatório", v: "Ajusta o preço de entrada com base no risco real de prova e nulidades." },
          ].map((c) => (
            <div key={c.k} className="rounded-xl border border-border bg-card/70 backdrop-blur p-5">
              <div className="text-sm font-semibold text-foreground">{c.k}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
