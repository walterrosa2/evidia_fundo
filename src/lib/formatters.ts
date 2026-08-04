export const formatCurrency = (n: number, opts?: { compact?: boolean }) => {
  if (opts?.compact) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatPercent = (n: number, digits = 0) => `${n.toFixed(digits)}%`;

export const formatNumber = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
