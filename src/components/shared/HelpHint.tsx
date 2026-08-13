import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Ajuda contextual de campo.
 *
 * O balão é renderizado num portal no `document.body`, com posicionamento fixo calculado a partir
 * do botão. A versão anterior usava `position: absolute` no fluxo, e por isso era recortada por
 * qualquer ancestral com `overflow: hidden` ou `overflow-x: auto` — o que acontecia nas tabelas
 * do Deal Flow e da memória de cálculo, e em todos os cartões com cantos arredondados.
 *
 * O balão só é montado quando aberto, o que também o mantém seguro na renderização no servidor.
 */

const TOOLTIP_WIDTH = 288;
const GAP = 8;
const VIEWPORT_MARGIN = 12;

type Placement = "top" | "bottom";

type Position = { top: number; left: number; placement: Placement; arrowLeft: number };

export function HelpHint({
  label,
  text,
  align = "center",
  side = "top",
  className,
}: {
  label: string;
  text: string;
  /** Preferência de alinhamento horizontal. O balão é reposicionado se não couber. */
  align?: "left" | "center" | "right";
  /** Preferência de lado. Invertido automaticamente quando falta espaço. */
  side?: Placement;
  className?: string;
}) {
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  const compute = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);

    // Altura estimada a partir do texto: evita medir antes de pintar.
    const estimatedHeight = Math.max(56, Math.ceil(text.length / 42) * 18 + 24);

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    let placement: Placement = side;
    if (placement === "top" && spaceAbove < estimatedHeight + GAP && spaceBelow > spaceAbove) {
      placement = "bottom";
    } else if (
      placement === "bottom" &&
      spaceBelow < estimatedHeight + GAP &&
      spaceAbove > spaceBelow
    ) {
      placement = "top";
    }

    const anchorX = rect.left + rect.width / 2;
    let left =
      align === "left" ? rect.left : align === "right" ? rect.right - width : anchorX - width / 2;

    // Mantém o balão dentro da viewport.
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN));

    const top = placement === "top" ? rect.top - GAP : rect.bottom + GAP;

    setPosition({
      top,
      left,
      placement,
      arrowLeft: Math.max(10, Math.min(anchorX - left, width - 10)),
    });
  }, [align, side, text.length]);

  const open = useCallback(() => compute(), [compute]);
  const close = useCallback(() => setPosition(null), []);

  // Fecha ou reposiciona quando a página se move sob o balão.
  useEffect(() => {
    if (!position) return;
    const onScroll = () => compute();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [position, compute, close]);

  return (
    <span
      className={`inline-flex normal-case tracking-normal ${className ?? ""}`}
      onMouseEnter={open}
      onMouseLeave={close}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ajuda sobre ${label}`}
        aria-describedby={position ? tooltipId : undefined}
        onFocus={open}
        onBlur={close}
        onClick={() => (position ? close() : open())}
        className="grid size-4 shrink-0 place-items-center rounded-full border border-muted-foreground/50 text-[10px] font-semibold leading-none text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        ?
      </button>

      {position &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2),
              transform: position.placement === "top" ? "translateY(-100%)" : undefined,
            }}
            className="pointer-events-none z-[100] block rounded-lg border border-border bg-popover px-3.5 py-2.5 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-xl"
          >
            {text}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: position.arrowLeft,
                [position.placement === "top" ? "bottom" : "top"]: -4,
              }}
              className={`size-2 -translate-x-1/2 rotate-45 border-border bg-popover ${
                position.placement === "top" ? "border-b border-r" : "border-l border-t"
              }`}
            />
          </span>,
          document.body,
        )}
    </span>
  );
}
