/**
 * Apresentação e leitura de valores decimais.
 *
 * O contrato da API trafega dinheiro como texto decimal ("1000000.50"). Estas funções
 * trabalham sobre o texto, sem passar por número de ponto flutuante: nada aqui calcula
 * resultado econômico — apenas formata o que o servidor devolveu e normaliza o que o
 * usuário digitou.
 */

const DECIMAL = /^-?\d+(\.\d+)?$/;

const currencyPrefix: Record<string, string> = { BRL: "R$" };

function group(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "1000000.5" → "R$ 1.000.000,50"; negativo com sinal antes do símbolo. */
export function formatMoney(value: string, currency = "BRL"): string {
  if (!DECIMAL.test(value)) return value;
  const negative = value.startsWith("-");
  const [integer, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const cents = (fraction + "00").slice(0, 2);
  const prefix = currencyPrefix[currency] ?? currency;
  const nbsp = String.fromCharCode(160);
  return `${negative ? "−" : ""}${prefix}${nbsp}${group(integer)},${cents}`;
}

/**
 * Lê um valor digitado em formato brasileiro ou decimal e devolve o texto decimal do
 * contrato. Com vírgula, pontos são separadores de milhar; sem vírgula, pontos em
 * grupos de três dígitos ("1.000.000") também são milhar; caso contrário, o ponto é
 * decimal. Devolve `null` quando o texto não é um número.
 */
export function parseDecimalInput(raw: string): string | null {
  let text = raw.replace(/\s|R\$/g, "");
  if (!text) return null;
  const negative = text.startsWith("-") || text.startsWith("−");
  if (negative) text = text.slice(1);

  if (text.includes(",")) {
    if (text.indexOf(",") !== text.lastIndexOf(",")) return null;
    const [integer, fraction] = text.split(",");
    if (integer.includes(".") && !/^\d{1,3}(\.\d{3})+$/.test(integer)) return null;
    text = `${integer.replace(/\./g, "")}.${fraction}`;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  if (text.endsWith(".")) text = text.slice(0, -1);
  if (!/^\d+(\.\d+)?$/.test(text)) return null;

  const [integer, fraction] = text.split(".");
  const cleanInteger = integer.replace(/^0+(?=\d)/, "");
  const normalized = fraction ? `${cleanInteger}.${fraction}` : cleanInteger;
  return negative && /[1-9]/.test(normalized) ? `-${normalized}` : normalized;
}

/** Desloca a vírgula decimal de um texto decimal, sem aritmética de ponto flutuante. */
export function shiftDecimal(value: string, places: number): string {
  const negative = value.startsWith("-");
  const [integer, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const digits = integer + fraction;
  let point = integer.length + places;
  let padded = digits;
  if (point <= 0) {
    padded = "0".repeat(1 - point) + digits;
    point = 1;
  } else if (point > padded.length) {
    padded = padded + "0".repeat(point - padded.length);
  }
  const whole = padded.slice(0, point).replace(/^0+(?=\d)/, "");
  const rest = padded.slice(point).replace(/0+$/, "");
  const out = rest ? `${whole}.${rest}` : whole;
  return negative && /[1-9]/.test(out) ? `-${out}` : out;
}

/** "15" ou "15,5" (percentual digitado) → "0.15" / "0.155" (fração do contrato). */
export function parsePercentInput(raw: string): string | null {
  const parsed = parseDecimalInput(raw.replace(/%/g, ""));
  return parsed === null ? null : shiftDecimal(parsed, -2);
}

/** "0.15" → "15%"; "0.155" → "15,5%". */
export function formatPercent(fraction: string): string {
  if (!DECIMAL.test(fraction)) return fraction;
  return `${shiftDecimal(fraction, 2).replace(".", ",")}%`;
}

/** "2" → "2 anos"; "0.5" → "0,5 ano". */
export function formatYears(years: string): string {
  const plural = years !== "1" && !/^0(\.\d+)?$/.test(years);
  return `${years.replace(".", ",")} ${plural ? "anos" : "ano"}`;
}
