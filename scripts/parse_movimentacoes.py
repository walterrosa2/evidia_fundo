"""Parser da listagem de documentos da capa PJe: extrai data + descricao do ato."""
import re
from collections import OrderedDict
from pathlib import Path

ARQUIVOS = {
    "GRITTI": (
        r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados"
        r"\PAULO GRITTI x MATSUDA\resultado_PAULO GRITTI x MATSUDA_20260716-0806.txt",
        1,
        10,
    ),
    "FEB": (
        r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados"
        r"\Federação Espírita X SAP\resultado_paginado_FEB x SAP_20260715-1629_20260716-0755_v2.txt",
        1,
        12,
    ),
}

RE_PAGINA = re.compile(r"---\s*\[\s*P[a\u00e1\ufffd]gina:\s*(\d+)\s*\]\s*---")
RE_DATAHORA = re.compile(r"(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})")

# Ruido a descartar
DESCARTE = re.compile(
    r"^(Documento Diverso|Petição|Despacho|Termo|Certidão|Intimação|Ato Ordinatório|"
    r"Procuração|Documento de identificação|Protocolo|\d+|Num\.|Pág\.|https?://|"
    r"Assinado|Número do documento)",
    re.IGNORECASE,
)


def faixa(texto, paginas, ini, fim):
    a = next((p for p, n in paginas if n == ini), 0)
    b = next((p for p, n in paginas if n == fim), len(texto))
    return texto[a:b]


for nome, (caminho, ini, fim) in ARQUIVOS.items():
    p = Path(caminho)
    if not p.exists():
        print(f"AVISO: nao encontrado -> {caminho}")
        continue

    texto = p.read_text(encoding="utf-8", errors="replace")
    paginas = [(m.start(), int(m.group(1))) for m in RE_PAGINA.finditer(texto)]
    bloco = faixa(texto, paginas, ini, fim)
    linhas = [l.strip() for l in bloco.split("\n")]

    eventos = OrderedDict()
    for i, linha in enumerate(linhas):
        m = RE_DATAHORA.search(linha)
        if not m:
            continue
        dia, mes, ano = m.group(1).split("/")
        iso = f"{ano}-{mes}-{dia}"

        # Descricao: resto da linha apos a hora, ou proximas linhas uteis
        resto = linha[m.end():].strip()
        candidatos = [resto] if resto else []
        for j in range(i + 1, min(i + 4, len(linhas))):
            prox = linhas[j]
            if RE_DATAHORA.search(prox):
                break
            if prox and not DESCARTE.match(prox):
                candidatos.append(prox)
        desc = " | ".join(c for c in candidatos if c)[:150]
        if not desc:
            desc = resto or "(sem descricao)"
        eventos.setdefault((iso, desc), None)

    print("=" * 110)
    print(f"CASO: {nome} — {len(eventos)} atos datados na capa")
    print("=" * 110)
    for iso, desc in sorted(eventos):
        print(f"  {iso}  {desc}")
    print()
