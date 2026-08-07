import type { ComponentType } from "react";
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
import { useCaseSelection } from "@/contexts/useCaseSelection";

type StaticRoute =
  | "/pipeline"
  | "/dashboard"
  | "/deals"
  | "/nulidade360"
  | "/red-team"
  | "/valuation"
  | "/relatorios"
  | "/configuracoes";

type NavigationItem = {
  to: StaticRoute;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const primaryNav: NavigationItem[] = [
  { to: "/pipeline", label: "Como funciona", icon: GitBranch },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/deals",
    label: "Deal Flow",
    icon: Workflow,
    match: (pathname) => pathname === "/deals" || pathname === "/deals/",
  },
];

const analysisNav: NavigationItem[] = [
  { to: "/nulidade360", label: "Nulidade360", icon: ShieldAlert },
  { to: "/red-team", label: "Red Team", icon: Swords },
  { to: "/valuation", label: "Valuation", icon: TrendingUp },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function StaticNavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = item.match
    ? item.match(pathname)
    : pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const { selectedDeal } = useCaseSelection();
  const activeCaseRoute = pathname.startsWith("/deals/");
  const caseRouteId = activeCaseRoute ? pathname.split("/")[2] : selectedDeal.id;

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
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {primaryNav.map((item) => (
          <StaticNavigationLink
            key={item.to}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
        <Link
          to="/deals/$id"
          params={{ id: caseRouteId }}
          onClick={onNavigate}
          className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            activeCaseRoute
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          }`}
        >
          <Briefcase className={`size-4 ${activeCaseRoute ? "text-primary" : ""}`} />
          <span>Casos</span>
        </Link>
        {analysisNav.map((item) => (
          <StaticNavigationLink
            key={item.to}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
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
