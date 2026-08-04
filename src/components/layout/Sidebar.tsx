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
  GitBranch,
} from "lucide-react";

const nav = [
  { to: "/pipeline", label: "Como funciona", icon: GitBranch },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/deals",
    label: "Deal Flow",
    icon: Workflow,
    match: (pathname: string) => pathname === "/deals" || pathname === "/deals/",
  },
  {
    to: "/deals/case-feb-sap",
    label: "Casos",
    icon: Briefcase,
    match: (pathname: string) => pathname.startsWith("/deals/"),
  },
  { to: "/nulidade360", label: "Nulidade360", icon: ShieldAlert },
  { to: "/red-team", label: "Red Team", icon: Swords },
  { to: "/valuation", label: "Valuation", icon: TrendingUp },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function Sidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  return (
    <aside
      className={
        mobile
          ? "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background shadow-2xl"
          : "hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur"
      }
    >
      <div className="flex h-16 items-center justify-center overflow-hidden border-b border-border">
        <img src="/brand/evidia-logo.png" alt="EvidIA" className="h-auto w-40 shrink-0" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, ...item }) => {
          const active =
            "match" in item
              ? item.match(pathname)
              : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
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
