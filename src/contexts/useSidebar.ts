import { useContext } from "react";
import { SidebarContext } from "@/contexts/sidebarStore";

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar precisa estar dentro de SidebarProvider.");
  }
  return context;
}
