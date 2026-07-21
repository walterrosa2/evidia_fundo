import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Workflow,
  Briefcase,
  ShieldAlert,
  Swords,
  TrendingUp,
  FileText,
  Settings,
  Scale,
} from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/deals", label: "Deal Flow", icon: Workflow },
  { to: "/deals/atlas-energia-delta", label: "Casos", icon: Briefcase },
  { to: "/nulidade360", label: "Nulidade360", icon: ShieldAlert },
  { to: "/red-team", label: "Red Team", icon: Swords },
  { to: "/valuation", label: "Valuation", icon: TrendingUp },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur">
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-border">
        <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-cyan to-violet">
          <Scale className="size-5 text-background" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-foreground">EvidIA</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Investor Suite
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => {
          const active =
            pathname === to ||
            (to !== "/dashboard" && pathname.startsWith(to.split("/").slice(0, 2).join("/")));
          return (
            <Link
              key={to}
              to={to}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-lg border border-border bg-surface-elevated/60 p-3 text-xs">
        <div className="flex items-center gap-2 text-foreground">
          <span className="size-2 rounded-full bg-risk-low animate-pulse" />
          Ambiente: Demonstração
        </div>
        <p className="mt-1.5 text-muted-foreground leading-snug">
          Dados fictícios. Nenhuma informação real é processada.
        </p>
      </div>
    </aside>
  );
}
