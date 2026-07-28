import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children, context }: { children: React.ReactNode; context?: string }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {mobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar navegação"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar mobile onNavigate={() => setMobileNavOpen(false)} />
        </>
      )}
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar context={context} onMenuToggle={() => setMobileNavOpen((open) => !open)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
