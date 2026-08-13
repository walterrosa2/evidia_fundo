import { createContext } from "react";

export type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
};

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export const SIDEBAR_STORAGE_KEY = "evidia:sidebar-collapsed";
