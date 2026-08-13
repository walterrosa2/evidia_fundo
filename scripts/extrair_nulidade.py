"""Extrai os achados estruturados dos pareceres Nulidade360 e gera TypeScript.

Estrutura de cada .docx:
  Tabela 0        -> identificacao do caso
  Tabela 1        -> sintese de risco (score global, nivel, achados, explicacao)
  Tabela 2        -> score por pilar
  Tabelas 3..N    -> metadados de cada achado, na mesma ordem dos Heading 3
  Heading 3       -> pergunta do quesito
  Paragrafos      -> Fundamento juridico, Dever violado, Ato afetado, Inferencia,
                     Prejuizo, Nexo causal, Impacto processual, Estrategia,
                     Acao recomendada, Evidencias mapeadas
  List Bullet     -> evidencias com "Pagina N: trecho"
"""
import json
import re
import sys
from pathlib import Path

from docx import Document

BASE = Path(r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados")

CASOS = {
    "eletromar": BASE / "ELETROMAR X TOTVS" / "nulidade360_caso_19_analise_27_ELETROMAR X TOTVS.docx",
    "feb": BASE / "Federação Espírita X SAP" / "nulidade360_caso_17_analise_25_Federação Espírita X SAP.docx",
    "gritti": BASE / "PAULO GRITTI x MATSUDA" / "nulidade360_caso_18_analise_26_PAULO GRITTI x MATSUDA.docx",
}

CAMPOS = {
    "Fundamento juridico": "legalBasis",
    "Dever violado": "breachedDuty",
    "Ato afetado": "affectedAct",
    "Inferencia": "inference",
    "Prejuizo": "prejudice",
    "Nexo causal": "causalLink",
    "Impacto processual": "proceduralImpact",
    "Estrategia": "strategy",
    "Acao recomendada": "recommendedAction",
    "Evidencias mapeadas": "evidenceNotes",
}

META = {
    "Pilar": "pillar",
    "Categoria": "category",
    "Natureza do vicio": "defectNature",
    "Nivel de risco": "riskLevel",
    "Score": "score",
    "Forca da evidencia": "evidenceStrength",
    "Suporte no mapa de evidencias": "evidenceMapSupport",
    "Valor estrategico": "strategicValue",
    "Risco de preclusao": "preclusionRisk",
}


def limpar(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip()


def extrair(caminho: Path) -> dict:
    doc = Document(str(caminho))

    def tabela_kv(tabela) -> dict:
        return {limpar(r.cells[0].text): limpar(r.cells[1].text) for r in tabela.rows}

    identificacao = tabela_kv(doc.tables[0])
    sintese = tabela_kv(doc.tables[1])
    por_pilar = tabela_kv(doc.tables[2])
    metadados = [tabela_kv(t) for t in doc.tables[3:]]

    achados = []
    atual = None
    dentro_dos_achados = False
    for p in doc.paragraphs:
        texto = p.text.strip()
        if not texto:
            continue
        estilo = p.style.name

        # A secao "3. Achados aceitos" delimita o inicio; antes dela ha "2.1 Score por pilar",
        # que tambem e Heading 3 e seria capturado como achado.
        if estilo == "Heading 2":
            dentro_dos_achados = texto.lower().startswith("3.")
            continue

        if not dentro_dos_achados:
            continue

        if estilo == "Heading 3":
            m = re.match(r"^(\d+)\.\s*(.+)$", texto)
            if not m:
                continue
            atual = {"index": int(m.group(1)), "question": limpar(m.group(2)), "evidences": []}
            achados.append(atual)
            continue

        if atual is None:
            continue

        if estilo == "List Bullet":
            m = re.match(r"P[aá]gina\s+(\d+):\s*(.+)$", texto, re.DOTALL)
            if m:
                atual["evidences"].append(
                    {"page": int(m.group(1)), "excerpt": limpar(m.group(2))[:600]}
                )
            continue

        for rotulo, chave in CAMPOS.items():
            if texto.startswith(rotulo + ":"):
                atual[chave] = limpar(texto[len(rotulo) + 1:])
                break

    # Casa metadados por ordem
    for i, achado in enumerate(achados):
        if i < len(metadados):
            bruto = metadados[i]
            for rotulo, chave in META.items():
                if rotulo in bruto:
                    achado[chave] = bruto[rotulo]

    return {
        "identificacao": identificacao,
        "sintese": sintese,
        "porPilar": por_pilar,
        "achados": achados,
    }


if __name__ == "__main__":
    saida = {}
    for nome, caminho in CASOS.items():
        if not caminho.exists():
            print(f"AVISO: nao encontrado {caminho}")
            continue
        dados = extrair(caminho)
        saida[nome] = dados
        com_meta = sum(1 for a in dados["achados"] if "pillar" in a)
        com_score = sum(1 for a in dados["achados"] if "score" in a)
        evid = sum(len(a["evidences"]) for a in dados["achados"])
        print(
            f"{nome:10s}: {len(dados['achados'])} achados | {com_meta} com pilar | "
            f"{com_score} com score | {evid} evidencias | pilares: {len(dados['porPilar'])}"
        )

    destino = Path(sys.argv[1]) / "pilares.json"
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n-> {destino}")
