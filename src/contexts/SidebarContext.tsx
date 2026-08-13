import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SIDEBAR_STORAGE_KEY,
  SidebarContext,
  type SidebarContextValue,
} from "@/contexts/sidebarStore";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
  }, []);

  const persist = useCallback((value: boolean) => {
    setCollapsed(value);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // Atalho: Ctrl/Cmd + B recolhe e expande a navegação.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const value = useMemo<SidebarContextValue>(
    () => ({ collapsed, toggle, setCollapsed: persist }),
    [collapsed, toggle, persist],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
