import type { ComponentType } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Workflow,
  Briefcase,
  ShieldAlert,
  Swords,
  TrendingUp,
  Calculator,
  FileText,
  Settings,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useCaseSelection } from "@/contexts/useCaseSelection";
import { useSidebar } from "@/contexts/useSidebar";

type StaticRoute =
  | "/pipeline"
  | "/dashboard"
  | "/deals"
  | "/nulidade360"
  | "/red-team"
  | "/valuation"
  | "/calculo-judicial"
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
  { to: "/calculo-judicial", label: "Cálculo judicial", icon: Calculator },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function StaticNavigationLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  collapsed: boolean;
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
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={`group flex items-center rounded-md py-2 text-sm transition-colors ${
        collapsed ? "justify-center px-2" : "gap-3 px-3"
      } ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
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
  const { collapsed, toggle } = useSidebar();
  const activeCaseRoute = pathname.startsWith("/deals/");
  const caseRouteId = activeCaseRoute ? pathname.split("/")[2] : selectedDeal.id;

  // No painel móvel a navegação é sempre expandida.
  const isCollapsed = mobile ? false : collapsed;

  return (
    <aside
      className={
        mobile
          ? "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background shadow-2xl"
          : `hidden shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur transition-[width] duration-200 md:flex ${
              isCollapsed ? "md:w-16" : "md:w-64"
            }`
      }
    >
      <div
        className={`flex h-16 items-center border-b border-border ${
          isCollapsed ? "justify-center px-2" : "justify-between px-3"
        }`}
      >
        {isCollapsed ? (
          <img src="/brand/evidia-logo.png" alt="EvidIA" className="size-8 object-contain" />
        ) : (
          <img src="/brand/evidia-logo.png" alt="EvidIA" className="h-auto w-36 shrink-0" />
        )}
        {!mobile && !isCollapsed && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!isCollapsed}
            aria-label="Recolher navegação"
            title="Recolher navegação (Ctrl+B)"
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {!mobile && isCollapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!isCollapsed}
          aria-label="Expandir navegação"
          title="Expandir navegação (Ctrl+B)"
          className="mx-auto mt-3 grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <nav className={`flex-1 space-y-0.5 overflow-y-auto py-4 ${isCollapsed ? "px-2" : "px-3"}`}>
        {primaryNav.map((item) => (
          <StaticNavigationLink
            key={item.to}
            item={item}
            pathname={pathname}
            collapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        ))}
        <Link
          to="/deals/$id"
          params={{ id: caseRouteId }}
          onClick={onNavigate}
          title={isCollapsed ? "Casos" : undefined}
          aria-label={isCollapsed ? "Casos" : undefined}
          className={`group flex items-center rounded-md py-2 text-sm transition-colors ${
            isCollapsed ? "justify-center px-2" : "gap-3 px-3"
          } ${
            activeCaseRoute
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          }`}
        >
          <Briefcase className={`size-4 shrink-0 ${activeCaseRoute ? "text-primary" : ""}`} />
          {!isCollapsed && <span>Casos</span>}
        </Link>
        {analysisNav.map((item) => (
          <StaticNavigationLink
            key={item.to}
            item={item}
            pathname={pathname}
            collapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {isCollapsed ? (
        <div
          className="m-2 grid place-items-center rounded-lg border border-border bg-surface-elevated/60 py-2"
          title="Ambiente de demonstração: casos reais com métricas simuladas"
        >
          <span className="size-2 animate-pulse rounded-full bg-risk-low" />
        </div>
      ) : (
        <div className="m-3 rounded-lg border border-border bg-surface-elevated/60 p-3 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <span className="size-2 rounded-full bg-risk-low animate-pulse" />
            Ambiente: demonstração
          </div>
          <p className="mt-1.5 leading-snug text-muted-foreground">
            Casos baseados em documentos processuais públicos. Scores, probabilidades e valuation
            são simulados.
          </p>
        </div>
      )}
    </aside>
  );
}
