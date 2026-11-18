import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MARGIN = 12;
const GAP = 6;

type Box = { top: number; left: number; maxHeight: number };

/**
 * Painel flutuante de filtro/configuração. Renderizado em portal no `body`, com posição
 * fixa calculada a partir do botão que o abriu: nunca é recortado por contêiner com
 * rolagem. Inverte para cima quando falta espaço abaixo e se mantém dentro da janela.
 */
export function AnchoredPopover({
  anchor,
  label,
  width = 300,
  onClose,
  children,
}: {
  anchor: HTMLElement | null;
  label: string;
  width?: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  const place = useCallback(() => {
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const rect = anchor.getBoundingClientRect();
    const panelWidth = Math.min(width, window.innerWidth - MARGIN * 2);
    const height = panel.scrollHeight;
    const below = window.innerHeight - rect.bottom - GAP - MARGIN;
    const above = rect.top - GAP - MARGIN;
    const openUp = height > below && above > below;
    const maxHeight = Math.max(160, openUp ? above : below);
    const shown = Math.min(height, maxHeight);
    const top = openUp ? Math.max(MARGIN, rect.top - GAP - shown) : rect.bottom + GAP;
    const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - panelWidth - MARGIN));
    setBox((current) =>
      current && current.top === top && current.left === left && current.maxHeight === maxHeight
        ? current
        : { top, left, maxHeight },
    );
  }, [anchor, width]);

  // Mede depois de pintar o conteúdo e a cada mudança de tamanho dele.
  useLayoutEffect(() => {
    place();
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [place]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        anchor?.focus({ preventScroll: true });
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [anchor, onClose, place]);

  // Leva o foco ao primeiro controle do painel ao abrir.
  useEffect(() => {
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(
      "input:not([disabled]), select, button:not([disabled])",
    );
    (first ?? panel)?.focus({ preventScroll: true });
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: box?.top ?? 0,
        left: box?.left ?? 0,
        width: `min(${width}px, calc(100vw - ${MARGIN * 2}px))`,
        maxHeight: box?.maxHeight,
        visibility: box ? "visible" : "hidden",
      }}
      className="z-[9999] overflow-auto overscroll-contain rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-2xl focus-visible:outline-none"
    >
      {children}
    </div>,
    document.body,
  );
}
