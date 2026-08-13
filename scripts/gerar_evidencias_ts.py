"""Gera src/data/v2/evidenceDossier.ts a partir do relatorio_final.xlsx do pipeline P4.

O relatorio traz tres abas:
  Provas    -> Bloco, TipoProva, Resumo, Referencia, Conteudo
  Quesitos  -> Bloco, Quesito
  Respostas -> Bloco, Quesito, RespostaTecnica, StatusTecnico, JustificativaTecnica, Observacoes
"""
import re
import sys
from pathlib import Path

import openpyxl

ARQUIVO = Path(
    r"E:\Backup_HD_Walter\Cruvinel_dados\Projeto Evidencias e Provas\P4"
    r"\execucoes\ELETROMAR_X_TOTVS\relatorio_final.xlsx"
)
CASE_ID = "case-eletromar-totvs"

STATUS = {
    "conforme": "compliant",
    "não conforme": "non_compliant",
    "nao conforme": "non_compliant",
    "parcialmente conforme": "partially_compliant",
    "inconclusivo": "inconclusive",
}

TIPO = {
    "CONTRATOS (PROPRIA OU TERCEIROS)": "contracts",
    "PAGAMENTOS (ted, pix, boletos, etc)": "payments",
    "MULTAS CONTRATUAIS": "penalties",
    "APONTAMENTOS (OSs)": "service_orders",
    "BASE DE CALCULO (HORAS INTERNAS COLABORADORES)": "internal_hours",
    "PERDAS DIRETAS OU INDIRETAS": "losses",
    "REEMBOLSO E DESPESAS VIAGENS": "travel_expenses",
}


def esc(valor) -> str:
    if valor is None:
        return ""
    texto = str(valor).replace("\\", "\\\\").replace('"', '\\"')
    return re.sub(r"\s+", " ", texto).strip()


def bloco_num(valor) -> int:
    m = re.search(r"(\d+)", str(valor or ""))
    return int(m.group(1)) if m else 0


def main(destino: Path):
    wb = openpyxl.load_workbook(str(ARQUIVO), data_only=True)

    provas = list(wb["Provas"].iter_rows(values_only=True))[1:]
    quesitos = list(wb["Quesitos"].iter_rows(values_only=True))[1:]
    respostas = list(wb["Respostas"].iter_rows(values_only=True))[1:]

    linhas = [
        "/**",
        " * Dossiê de provas, quesitos e respostas simuladas — pipeline de evidências (P4).",
        " *",
        " * Gerado a partir de `relatorio_final.xlsx` pelo script `scripts/gerar_evidencias_ts.py`.",
        " * As respostas representam o parecer técnico simulado da ré aos quesitos formulados pela",
        " * autora, com o status de conformidade apurado pelo agente e a justificativa que o sustenta.",
        " *",
        " * NÃO EDITAR À MÃO: regenerar a partir do relatório.",
        " */",
        "",
        "export type EvidenceCategory =",
        "  | " + "\n  | ".join(f'"{v}"' for v in dict.fromkeys(TIPO.values())) + ";",
        "",
        "export type TechnicalStatus =",
        '  | "compliant"',
        '  | "non_compliant"',
        '  | "partially_compliant"',
        '  | "inconclusive";',
        "",
        "export const EVIDENCE_CATEGORY_LABEL: Record<EvidenceCategory, string> = {",
        '  contracts: "Contratos",',
        '  payments: "Pagamentos",',
        '  penalties: "Multas contratuais",',
        '  service_orders: "Apontamentos e OSs",',
        '  internal_hours: "Horas internas",',
        '  losses: "Perdas diretas e indiretas",',
        '  travel_expenses: "Reembolsos e viagens",',
        "};",
        "",
        "export const TECHNICAL_STATUS_LABEL: Record<TechnicalStatus, string> = {",
        '  compliant: "Conforme",',
        '  non_compliant: "Não conforme",',
        '  partially_compliant: "Parcialmente conforme",',
        '  inconclusive: "Inconclusivo",',
        "};",
        "",
        "export interface CollectedEvidence {",
        "  id: string;",
        "  block: number;",
        "  category: EvidenceCategory;",
        "  /** Por que a prova importa para a tese. */",
        "  summary: string;",
        "  /** Referência de folha nos autos. */",
        "  reference: string;",
        "  /** Trecho transcrito do documento. */",
        "  content: string;",
        "}",
        "",
        "export interface TechnicalQuery {",
        "  id: string;",
        "  block: number;",
        "  /** Quesito formulado pela autora. */",
        "  question: string;",
        "  /** Resposta técnica simulada da ré. */",
        "  answer: string;",
        "  status: TechnicalStatus;",
        "  /** Fundamentação da resposta, com referências de folha. */",
        "  rationale: string;",
        "  /** Ressalvas do agente sobre o alcance da resposta. */",
        "  notes: string;",
        "}",
        "",
        "export interface EvidenceDossier {",
        "  caseId: string;",
        "  evidences: CollectedEvidence[];",
        "  queries: TechnicalQuery[];",
        "}",
        "",
        f"export const eletromarDossier: EvidenceDossier = {{",
        f'  caseId: "{CASE_ID}",',
        "  evidences: [",
    ]

    for i, row in enumerate(provas, start=1):
        bloco, tipo, resumo, referencia, conteudo = (list(row) + [None] * 5)[:5]
        if not tipo:
            continue
        linhas += [
            "    {",
            f'      id: "ev-{i:03d}",',
            f"      block: {bloco_num(bloco)},",
            f'      category: "{TIPO.get(str(tipo).strip(), "contracts")}",',
            f'      summary: "{esc(resumo)}",',
            f'      reference: "{esc(referencia)}",',
            f'      content: "{esc(conteudo)[:1200]}",',
            "    },",
        ]

    linhas += ["  ],", "  queries: ["]

    # Indexa respostas pelo texto do quesito
    por_quesito = {}
    for row in respostas:
        bloco, quesito, resposta, status, justificativa, observacoes = (list(row) + [None] * 6)[:6]
        if quesito:
            por_quesito[str(quesito).strip()] = (resposta, status, justificativa, observacoes)

    for i, row in enumerate(quesitos, start=1):
        bloco, quesito = (list(row) + [None] * 2)[:2]
        if not quesito:
            continue
        chave = str(quesito).strip()
        resposta, status, justificativa, observacoes = por_quesito.get(chave, (None, None, None, None))
        status_norm = STATUS.get(str(status or "").strip().lower(), "inconclusive")
        linhas += [
            "    {",
            f'      id: "q-{i:03d}",',
            f"      block: {bloco_num(bloco)},",
            f'      question: "{esc(quesito)}",',
            f'      answer: "{esc(resposta)}",',
            f'      status: "{status_norm}",',
            f'      rationale: "{esc(justificativa)}",',
            f'      notes: "{esc(observacoes)}",',
            "    },",
        ]

    linhas += [
        "  ],",
        "};",
        "",
        "export const evidenceDossiers: EvidenceDossier[] = [eletromarDossier];",
        "",
        "export function getEvidenceDossier(caseId: string): EvidenceDossier | undefined {",
        "  return evidenceDossiers.find((dossier) => dossier.caseId === caseId);",
        "}",
        "",
    ]

    destino.write_text("\n".join(linhas), encoding="utf-8")
    print(
        f"Gerado: {destino}\n"
        f"  provas: {len(provas)} | quesitos: {len(quesitos)} | respostas: {len(respostas)}"
    )


if __name__ == "__main__":
    main(Path(sys.argv[1]))
