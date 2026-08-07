import { mockDeals } from "@/data/mockDeals";

export type InvestmentMemoStatus = "Pronto" | "Revisão humana";

export type InvestmentMemoMetadata = {
  caseId: string;
  title: string;
  date: string;
  version: string;
  status: InvestmentMemoStatus;
  author: string;
};

const metadataByCase: Record<
  string,
  Pick<InvestmentMemoMetadata, "date" | "version" | "status" | "author">
> = {
  "case-eletromar-totvs": {
    date: "06/08/2026",
    version: "v1.0",
    status: "Revisão humana",
    author: "Equipe EvidIA",
  },
  "case-feb-sap": {
    date: "31/07/2026",
    version: "v1.3",
    status: "Pronto",
    author: "M. Almeida",
  },
  "case-paulo-gritti-matsuda": {
    date: "03/03/2026",
    version: "v1.1",
    status: "Pronto",
    author: "R. Tavares",
  },
};

export const investmentMemos: InvestmentMemoMetadata[] = mockDeals.map((deal) => {
  const metadata = metadataByCase[deal.id];
  return {
    caseId: deal.id,
    title: `Investment Memo — ${deal.name}`,
    ...metadata,
  };
});

export function getInvestmentMemoMetadata(caseId: string) {
  return investmentMemos.find((memo) => memo.caseId === caseId) ?? investmentMemos[0];
}
