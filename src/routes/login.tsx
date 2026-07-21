import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Scale, ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 700);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex relative overflow-hidden border-r border-border bg-surface/40 grid-bg p-12 flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-cyan to-violet">
            <Scale className="size-5 text-background" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">EvidIA</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Investor Suite
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">Investor Demo</div>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Inteligência probatória <br /> aplicada à decisão de <br />
            <span className="text-gradient">investimento litigioso</span>.
          </h2>
          <p className="mt-6 text-muted-foreground max-w-md">
            Reduza assimetria informacional, audite a prova, simule ataques adversariais
            e reprecifique seus deals com confiança.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Ambiente seguro · ISO 27001 simulado · LGPD ready
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Acesso institucional</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Demonstração para investidores. Nenhuma autenticação é processada.
          </p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">E-mail corporativo</span>
              <input
                defaultValue="socio@atlas.capital"
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Senha</span>
              <input
                type="password"
                defaultValue="••••••••••"
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar na demonstração"}
            <ArrowRight className="size-4" />
          </button>

          <div className="mt-6 text-[11px] text-muted-foreground text-center">
            Sessão demo · todos os dados são fictícios.
          </div>
        </form>
      </div>
    </div>
  );
}
