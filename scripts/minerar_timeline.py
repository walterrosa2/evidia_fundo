"""Minera eventos processuais datados dos autos OCR paginados.

Estrategia: varre o texto por pagina, encontra datas (dd/mm/aaaa e variantes por extenso)
e classifica o contexto por palavras-chave de atos processuais.
Saida: CSV/relatorio com data, tipo de ato, pagina e trecho de contexto.
"""
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ARQUIVOS = {
    "ELETROMAR": r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados\ELETROMAR X TOTVS\resultado_paginado_ELETROMAR  X TOTVS_20260805-1016_20260805-1409.txt",
    "FEB": r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados\Federação Espírita X SAP\resultado_paginado_FEB x SAP_20260715-1629_20260716-0755_v2.txt",
    "GRITTI": r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados\PAULO GRITTI x MATSUDA\resultado_PAULO GRITTI x MATSUDA_20260716-0806.txt",
}

MESES = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6,
    "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}

# Atos processuais -> rotulo canonico. Ordem importa (mais especifico primeiro).
ATOS = [
    ("sentenca",            r"\bsenten[cç]a\b|\bjulgo procedente\b|\bjulgo improcedente\b|\bjulgo parcialmente\b"),
    ("acordao",             r"\bac[oó]rd[aã]o\b|\bv\.?\s*u\.?\b.{0,40}\bturma\b|\bnegaram provimento\b|\bderam provimento\b"),
    ("laudo_pericial",      r"\blaudo pericial\b|\blaudo t[eé]cnico\b|\bentrega do laudo\b|\bjuntada do laudo\b"),
    ("pericia",             r"\bper[ií]cia\b|\bperito\b|\bdilig[eê]ncia pericial\b|\bvistoria\b"),
    ("quesitos",            r"\bquesitos?\b"),
    ("impugnacao_laudo",    r"\bimpugna[cç][aã]o ao laudo\b|\bimpugna[cç][aã]o do laudo\b"),
    ("agravo",              r"\bagravo de instrumento\b|\bagravo interno\b|\bagravo regimental\b|\bagravo\b"),
    ("apelacao",            r"\bapela[cç][aã]o\b|\brecurso de apela[cç][aã]o\b"),
    ("embargos",            r"\bembargos de declara[cç][aã]o\b|\bembargos\b"),
    ("recurso_especial",    r"\brecurso especial\b|\brecurso extraordin[aá]rio\b|\bresp\b"),
    ("contestacao",         r"\bcontesta[cç][aã]o\b"),
    ("replica",             r"\br[eé]plica\b|\bimpugna[cç][aã]o [aà] contesta[cç][aã]o\b"),
    ("saneamento",          r"\bsaneador\b|\bsaneamento\b|\bpontos controvertidos\b"),
    ("audiencia",           r"\baudi[eê]ncia\b|\bconcilia[cç][aã]o\b|\bmedia[cç][aã]o\b"),
    ("citacao",             r"\bcita[cç][aã]o\b|\bcitado\b|\bmandado de cita[cç][aã]o\b"),
    ("intimacao",           r"\bintima[cç][aã]o\b|\bintimad[oa]\b"),
    ("despacho",            r"\bdespacho\b|\bdespach[oe]i\b"),
    ("decisao",             r"\bdecis[aã]o interlocut[oó]ria\b|\bdecis[aã]o\b|\bdefiro\b|\bindefiro\b"),
    ("peticao",             r"\bpeti[cç][aã]o\b|\bpetitor[iy]o\b|\brequerimento\b"),
    ("juntada",             r"\bjuntada\b|\bjunte-se\b|\bjuntou\b"),
    ("distribuicao",        r"\bdistribui[cç][aã]o\b|\bdistribu[ií]d[oa]\b|\bprotocolad[oa]\b|\bautua[cç][aã]o\b"),
    ("conclusao",           r"\bconclus[aã]o ao juiz\b|\bconcluso\b|\bfa[cç]o os autos conclusos\b"),
    ("contrato",            r"\bcontrato\b|\bproposta comercial\b|\baditivo\b"),
    ("notificacao",         r"\bnotifica[cç][aã]o extrajudicial\b|\bnotifica[cç][aã]o\b"),
    ("negativacao",         r"\bserasa\b|\bspc\b|\bprotesto\b|\bnegativa[cç][aã]o\b|\bcadastro de inadimplentes\b"),
    ("pagamento",           r"\bpagamento\b|\bboleto\b|\bnota fiscal\b|\bfatura\b|\bted\b|\bcomprovante de dep[oó]sito\b"),
]

ATOS_COMPILADOS = [(nome, re.compile(pat, re.IGNORECASE)) for nome, pat in ATOS]

RE_PAGINA = re.compile(r"---\s*\[\s*P[aá\ufffd]gina:\s*(\d+)\s*\]\s*---")
RE_DATA_NUM = re.compile(r"\b(\d{1,2})[/\.\-](\d{1,2})[/\.\-](\d{2,4})\b")
RE_DATA_EXT = re.compile(
    r"\b(\d{1,2})\s+de\s+([a-z\u00e7\u00e3\u00e9\u00ea\u00ed\u00f3\u00fa]+)\s+de\s+(\d{4})\b",
    re.IGNORECASE,
)


def sem_acento(texto: str) -> str:
    return "".join(
        ch for ch in unicodedata.normalize("NFD", texto) if unicodedata.category(ch) != "Mn"
    ).lower()


def normalizar_data(dia, mes, ano):
    try:
        dia, mes, ano = int(dia), int(mes), int(ano)
    except (TypeError, ValueError):
        return None
    if ano < 100:
        ano += 2000 if ano < 50 else 1900
    if not (1 <= dia <= 31 and 1 <= mes <= 12 and 1990 <= ano <= 2030):
        return None
    return f"{ano:04d}-{mes:02d}-{dia:02d}"


def classificar(contexto: str):
    ctx = sem_acento(contexto)
    return [nome for nome, rx in ATOS_COMPILADOS if rx.search(ctx)]


def processar(nome_caso: str, caminho: str, out_dir: Path):
    texto = Path(caminho).read_text(encoding="utf-8", errors="replace")

    # Indexa offsets de pagina
    paginas = [(m.start(), int(m.group(1))) for m in RE_PAGINA.finditer(texto)]

    def pagina_de(pos: int) -> int:
        lo, hi, atual = 0, len(paginas) - 1, 0
        while lo <= hi:
            mid = (lo + hi) // 2
            if paginas[mid][0] <= pos:
                atual = paginas[mid][1]
                lo = mid + 1
            else:
                hi = mid - 1
        return atual

    eventos = []
    vistos = set()

    def registrar(iso, pos, contexto):
        atos = classificar(contexto)
        if not atos:
            return
        pag = pagina_de(pos)
        chave = (iso, atos[0], pag // 5)
        if chave in vistos:
            return
        vistos.add(chave)
        ctx = re.sub(r"\s+", " ", contexto).strip()
        eventos.append({"data": iso, "atos": atos, "pagina": pag, "contexto": ctx[:400]})

    for m in RE_DATA_NUM.finditer(texto):
        iso = normalizar_data(m.group(1), m.group(2), m.group(3))
        if iso:
            registrar(iso, m.start(), texto[max(0, m.start() - 260): m.end() + 260])

    for m in RE_DATA_EXT.finditer(texto):
        mes = MESES.get(sem_acento(m.group(2)))
        if mes:
            iso = normalizar_data(m.group(1), mes, m.group(3))
            if iso:
                registrar(iso, m.start(), texto[max(0, m.start() - 260): m.end() + 260])

    eventos.sort(key=lambda e: (e["data"], e["pagina"]))

    # Relatorio
    linhas = [
        f"### CASO: {nome_caso}",
        f"### ARQUIVO: {Path(caminho).name}",
        f"### PAGINAS OCR: {paginas[-1][1] if paginas else 0}",
        f"### EVENTOS DATADOS CLASSIFICADOS: {len(eventos)}",
        "",
        "=== DISTRIBUICAO POR ANO ===",
    ]
    for ano, qtd in sorted(Counter(e["data"][:4] for e in eventos).items()):
        linhas.append(f"  {ano}: {qtd}")

    linhas += ["", "=== DISTRIBUICAO POR TIPO DE ATO (ato primario) ==="]
    for ato, qtd in Counter(e["atos"][0] for e in eventos).most_common():
        linhas.append(f"  {qtd:5d}  {ato}")

    linhas += ["", "=== EVENTOS (ordenados por data) ==="]
    por_ano = defaultdict(list)
    for e in eventos:
        por_ano[e["data"][:4]].append(e)
    for ano in sorted(por_ano):
        linhas.append(f"\n----- {ano} ({len(por_ano[ano])} eventos) -----")
        for e in por_ano[ano]:
            linhas.append(
                f"  {e['data']} | p.{e['pagina']:>5} | {'+'.join(e['atos'][:3]):<45} | {e['contexto'][:260]}"
            )

    destino = out_dir / f"timeline_{nome_caso}.txt"
    destino.write_text("\n".join(linhas), encoding="utf-8")
    print(
        f"{nome_caso}: {len(eventos)} eventos datados | "
        f"{paginas[-1][1] if paginas else 0} paginas -> {destino.name}"
    )
    return eventos


if __name__ == "__main__":
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    for nome, caminho in ARQUIVOS.items():
        if not Path(caminho).exists():
            print(f"ERRO: nao encontrado -> {caminho}")
            continue
        processar(nome, caminho, out_dir)
