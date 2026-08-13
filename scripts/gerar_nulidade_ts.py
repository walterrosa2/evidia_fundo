"""Gera src/data/v2/nullityReports.ts a partir de pilares.json."""
import json
import re
import sys
from pathlib import Path

CASE_ID = {
    "eletromar": "case-eletromar-totvs",
    "feb": "case-feb-sap",
    "gritti": "case-paulo-gritti-matsuda",
}
PREFIXO = {"eletromar": "el", "feb": "feb", "gritti": "pg"}

NIVEL = {
    "baixo": "low",
    "moderado": "moderate",
    "alto": "high",
    "critico": "critical",
    "crítico": "critical",
}


def esc(texto: str) -> str:
    if texto is None:
        return ""
    t = texto.replace("\\", "\\\\").replace('"', '\\"')
    return re.sub(r"\s+", " ", t).strip()


def pilar_id(bruto: str) -> str:
    m = re.match(r"(P\d+)", bruto or "")
    return m.group(1) if m else "P0"


def campo(achado: dict, chave: str) -> str:
    valor = achado.get(chave, "")
    # O gerador do parecer as vezes emite o placeholder literal "string"
    if valor.strip().lower() in {"string", "n/a", "não identificado", "nao_identificado", ""}:
        return ""
    return valor


def main(origem: Path, destino: Path):
    dados = json.loads((origem / "pilares.json").read_text(encoding="utf-8"))

    linhas = [
        "/**",
        " * Pareceres Nulidade360 — dados extraídos dos relatórios de auditoria jurídico-pericial.",
        " *",
        " * Gerado a partir dos arquivos `nulidade360_caso_*.docx` pelo script",
        " * `scripts/gerar_nulidade.py`. Cada achado preserva os campos do parecer original:",
        " * fundamento jurídico, dever violado, ato afetado, inferência, prejuízo, nexo causal,",
        " * impacto processual, estratégia, ação recomendada e evidências mapeadas — além dos",
        " * metadados de classificação (pilar, categoria, natureza do vício, nível de risco, score,",
        " * força da evidência, suporte no mapa, valor estratégico e risco de preclusão).",
        " *",
        " * NÃO EDITAR À MÃO: regenerar a partir dos pareceres.",
        " */",
        "",
        'import type { RiskLevel } from "./mockRealCasesV2";',
        "",
        "export type NullityPillarId =",
        "  | " + "\n  | ".join(f'"P{i}"' for i in range(1, 15)) + ";",
        "",
        "export interface NullityPillarCatalogEntry {",
        "  id: NullityPillarId;",
        "  name: string;",
        "  scope: string;",
        "}",
        "",
        "/** Os 14 pilares auditados pelo Nulidade360. */",
        "export const NULLITY_PILLARS: NullityPillarCatalogEntry[] = [",
    ]

    catalogo = [
        ("P1", "Competência e Jurisdição", "Incompetência absoluta, prevenção ignorada, distribuição, conexão e continência."),
        ("P2", "Magistrado, Impedimento e Suspeição", "Imparcialidade objetiva do juízo e tratamento simétrico das partes."),
        ("P3", "Contraditório e Ampla Defesa", "Intimações, oportunidade real de manifestação, decisão surpresa e indeferimento de prova."),
        ("P4", "Produção da Prova", "Origem, autenticidade e integridade da prova; produção unilateral e alteração do objeto."),
        ("P5", "Nulidades Periciais", "Qualificação do perito, cronograma, resposta a quesitos, limites do objeto e metodologia."),
        ("P6", "Assistentes Técnicos", "Conflito de interesse, vínculo econômico e influência indevida."),
        ("P7", "Cadeia Decisória", "Omissão de provas, quesitos, impugnações e contradições relevantes do laudo."),
        ("P8", "Motivação e Fundamentação", "Fundamentação aparente, genérica, contraditória ou sem enfrentamento dos argumentos centrais."),
        ("P9", "Nulidades Recursais", "Omissão persistente, negativa de prestação jurisdicional e vício em julgamento colegiado."),
        ("P10", "Nulidades de Execução", "Cálculo, liquidação, penhora, avaliação e perícia contábil sem contraditório."),
        ("P11", "Governança Processual", "Concentração de nomeações, critério dirigido e governança na escolha do perito."),
        ("P12", "Nulidades Tecnológicas", "Auditabilidade de prova digital, sistemas, algoritmos e IA; logs, autenticação e integridade."),
        ("P13", "Violação de Normas Técnicas", "Observância concreta das normas técnicas aplicáveis, e não citação decorativa."),
        ("P14", "Descoberta Superveniente", "Fato superveniente que compromete imparcialidade, prova, cadeia de custódia ou legitimidade."),
    ]
    for pid, nome, escopo in catalogo:
        linhas.append(f'  {{ id: "{pid}", name: "{esc(nome)}", scope: "{esc(escopo)}" }},')
    linhas += [
        "];",
        "",
        "export interface NullityEvidence {",
        "  page: number;",
        "  excerpt: string;",
        "}",
        "",
        "export interface NullityFinding {",
        "  id: string;",
        "  /** Número do quesito no parecer. */",
        "  index: number;",
        "  /** Pergunta de auditoria respondida pelo achado. */",
        "  question: string;",
        "  pillar: NullityPillarId;",
        "  category: string;",
        "  defectNature: string;",
        "  riskLevel: RiskLevel;",
        "  /** Score do achado (0–100). Nulo quando o parecer não o apurou. */",
        "  score: number | null;",
        "  evidenceStrength: string;",
        "  evidenceMapSupport: string;",
        "  strategicValue: string;",
        "  preclusionRisk: string;",
        "  legalBasis: string;",
        "  breachedDuty: string;",
        "  affectedAct: string;",
        "  inference: string;",
        "  prejudice: string;",
        "  causalLink: string;",
        "  proceduralImpact: string;",
        "  strategy: string;",
        "  recommendedAction: string;",
        "  evidenceNotes: string;",
        "  evidences: NullityEvidence[];",
        "}",
        "",
        "export interface NullityPillarScore {",
        "  pillar: NullityPillarId;",
        "  score: number;",
        "  level: RiskLevel;",
        "  findingCount: number;",
        "}",
        "",
        "export interface NullityReport {",
        "  caseId: string;",
        "  globalScore: number;",
        "  globalLevel: RiskLevel;",
        "  acceptedFindings: number;",
        "  /** Texto da explicação do score, como consta do parecer. */",
        "  scoreExplanation: string;",
        "  weightedAverage: number;",
        "  maxRisk: number;",
        "  criticalFindings: number;",
        "  affectedPillars: number;",
        "  pillarScores: NullityPillarScore[];",
        "  findings: NullityFinding[];",
        "}",
        "",
    ]

    nomes_export = []
    for chave, dados_caso in dados.items():
        sintese = dados_caso["sintese"]
        explicacao = sintese.get("Explicacao do score", "")
        m_media = re.search(r"media ponderada ([\d.]+)", explicacao)
        m_maior = re.search(r"maior risco ([\d.]+)", explicacao)
        m_crit = re.search(r"(\d+) achado\(s\) critico", explicacao)
        m_pil = re.search(r"(\d+) pilar\(es\)", explicacao)

        var = f"{chave}NullityReport"
        nomes_export.append(var)
        linhas.append(f"export const {var}: NullityReport = {{")
        linhas.append(f'  caseId: "{CASE_ID[chave]}",')
        linhas.append(f'  globalScore: {sintese.get("Score global", "0")},')
        linhas.append(f'  globalLevel: "{NIVEL.get(sintese.get("Nivel global", "baixo"), "low")}",')
        linhas.append(f'  acceptedFindings: {sintese.get("Achados aceitos/editados", "0")},')
        linhas.append(f'  scoreExplanation: "{esc(explicacao)}",')
        linhas.append(f'  weightedAverage: {m_media.group(1) if m_media else 0},')
        linhas.append(f'  maxRisk: {m_maior.group(1) if m_maior else 0},')
        linhas.append(f'  criticalFindings: {m_crit.group(1) if m_crit else 0},')
        linhas.append(f'  affectedPillars: {m_pil.group(1) if m_pil else 0},')

        linhas.append("  pillarScores: [")
        for pilar, valor in dados_caso["porPilar"].items():
            m = re.match(r"([\d.]+)\s*/\s*(\w+)\s*\((\d+)", valor)
            if not m:
                continue
            linhas.append(
                f'    {{ pillar: "{pilar}", score: {m.group(1)}, '
                f'level: "{NIVEL.get(m.group(2), "low")}", findingCount: {m.group(3)} }},'
            )
        linhas.append("  ],")

        linhas.append("  findings: [")
        for achado in dados_caso["achados"]:
            score = achado.get("score")
            linhas.append("    {")
            linhas.append(f'      id: "{PREFIXO[chave]}-n{achado["index"]:02d}",')
            linhas.append(f'      index: {achado["index"]},')
            linhas.append(f'      question: "{esc(achado["question"])}",')
            linhas.append(f'      pillar: "{pilar_id(achado.get("pillar", ""))}",')
            linhas.append(f'      category: "{esc(campo(achado, "category"))}",')
            linhas.append(f'      defectNature: "{esc(campo(achado, "defectNature"))}",')
            linhas.append(f'      riskLevel: "{NIVEL.get(achado.get("riskLevel", "baixo"), "low")}",')
            linhas.append(f'      score: {score if score else "null"},')
            linhas.append(f'      evidenceStrength: "{esc(campo(achado, "evidenceStrength"))}",')
            linhas.append(f'      evidenceMapSupport: "{esc(campo(achado, "evidenceMapSupport"))}",')
            linhas.append(f'      strategicValue: "{esc(campo(achado, "strategicValue"))}",')
            linhas.append(f'      preclusionRisk: "{esc(campo(achado, "preclusionRisk"))}",')
            for chave_ts in (
                "legalBasis", "breachedDuty", "affectedAct", "inference", "prejudice",
                "causalLink", "proceduralImpact", "strategy", "recommendedAction", "evidenceNotes",
            ):
                linhas.append(f'      {chave_ts}: "{esc(campo(achado, chave_ts))}",')
            if achado["evidences"]:
                linhas.append("      evidences: [")
                for ev in achado["evidences"]:
                    linhas.append(
                        f'        {{ page: {ev["page"]}, excerpt: "{esc(ev["excerpt"])}" }},'
                    )
                linhas.append("      ],")
            else:
                linhas.append("      evidences: [],")
            linhas.append("    },")
        linhas.append("  ],")
        linhas.append("};")
        linhas.append("")

    linhas.append("export const nullityReports: NullityReport[] = [")
    for nome in nomes_export:
        linhas.append(f"  {nome},")
    linhas.append("];")
    linhas.append("")
    linhas.append("export function getNullityReport(caseId: string): NullityReport | undefined {")
    linhas.append("  return nullityReports.find((report) => report.caseId === caseId);")
    linhas.append("}")
    linhas.append("")

    destino.write_text("\n".join(linhas), encoding="utf-8")
    print(f"Gerado: {destino}  ({len(linhas)} linhas)")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
