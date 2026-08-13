import { useContext } from "react";
import { DemoEditContext } from "@/contexts/demoEditStore";

export function useDemoEdit() {
  const context = useContext(DemoEditContext);
  if (!context) {
    throw new Error("useDemoEdit precisa estar dentro de DemoEditProvider.");
  }
  return context;
}
