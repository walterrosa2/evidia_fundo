import { HelpHint } from "@/components/shared/HelpHint";

/**
 * Cabeçalho de coluna com ajuda contextual.
 *
 * O balão de ajuda é renderizado em portal, então não é recortado pelo
 * `overflow-x: auto` que envolve as tabelas largas.
 */
export function Th({
  children,
  help,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  /** Texto da ajuda. Sem ele, o cabeçalho é apenas texto. */
  help?: string;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const alignClass =
    align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

  return (
    <th
      className={`px-4 py-3 font-medium ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
    >
      <span className={`inline-flex items-center gap-1.5 ${alignClass}`}>
        {children}
        {help && (
          <HelpHint label={typeof children === "string" ? children : "coluna"} text={help} />
        )}
      </span>
    </th>
  );
}
