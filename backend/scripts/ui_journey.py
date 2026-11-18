"""Jornada de interface em navegador real (Edge via Playwright).

Uso (em backend/):  python scripts/ui_journey.py [--frontend http://localhost:5180]
Requer: pip install playwright  (usa o Edge instalado; nao baixa navegador).

Percorre login -> entrada -> importacao -> dossie -> documento -> afirmacao -> ficha em
tela inteira -> revisao, com a fixture SINTETICA. Grava capturas em artifacts/qa/ui/
(apenas dados sinteticos) e reprova se houver erro de console.
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import Page, expect, sync_playwright

from evidia.config import BACKEND_DIR, get_settings
from scripts.smoke_e2e import make_pdf

SHOTS = BACKEND_DIR.parent / "artifacts" / "qa" / "ui"


class Check:
    def __init__(self) -> None:
        self.failures = 0

    def __call__(self, label: str, condition: bool, detail: str = "") -> None:
        print(f"[{'OK  ' if condition else 'FAIL'}] {label}" + (f" — {detail}" if detail else ""))
        if not condition:
            self.failures += 1


def no_horizontal_scroll(page: Page) -> bool:
    return page.evaluate(
        "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"
    )


def inside_viewport(box: dict | None, width: int, height: int) -> bool:
    return (
        box is not None
        and box["x"] >= 0
        and box["y"] >= 0
        and box["x"] + box["width"] <= width + 1
        and box["y"] + box["height"] <= height + 1
    )


def economics(page: Page, check: Check, run: str, tmp: str) -> None:
    """Demonstrativo do reu com o exemplo do aceite AC14 e memoria em tela inteira."""
    page.get_by_role("tab", name="Redução de Passivo do Réu").click()
    submit = page.get_by_role("button", name="Calcular Redução de Passivo")
    submit.click()
    expect(page.get_by_text("Revise os campos destacados antes de calcular.")).to_be_visible()
    check(
        "demonstrativo vazio aponta os campos e leva o foco ao primeiro",
        page.evaluate("document.activeElement?.getAttribute('aria-invalid')") == "true",
    )

    label = f"Acordo {run}"
    page.get_by_label("Exposição de referência (R$)").fill("1.000.000,00")
    page.get_by_label("Nome do cenário").fill(label)
    page.get_by_label("Desembolso no cenário (R$)").fill("700.000")
    page.get_by_role("button", name="Adicionar Custo").click()
    page.get_by_label("Custo", exact=True).fill("Custo incremental")
    page.get_by_label("Valor (R$)").fill("50.000")
    submit.click()

    value = page.get_by_role(
        "button",
        name=f"Abrir memória de cálculo de redução líquida de passivo do cenário {label}",
    ).first
    expect(value).to_be_visible()
    check(
        "AC14 na tela: reducao liquida de R$ 250.000,00",
        "250.000,00" in value.inner_text(),
        value.inner_text(),
    )
    card = page.locator("article").filter(has_text=label).first
    check(
        "AC13 na tela: contrato e receita da Evidia aparecem como nao definidos",
        card.get_by_text("Não definido").count() >= 2 and "R$ 0,00" not in card.inner_text(),
    )

    url_before = page.url
    value.click()
    dialog = page.get_by_role("dialog", name=label)
    expect(dialog).to_be_visible()
    box = dialog.bounding_box()
    check(
        "memoria de calculo abre em tela inteira com Voltar no topo",
        box is not None
        and round(box["width"]) == 1440
        and round(box["height"]) == 900
        and dialog.get_by_role("button", name="Voltar").is_visible(),
        str(box),
    )
    text = dialog.inner_text()
    check(
        "memoria reproduz o valor: 1.000.000 - 700.000 - 50.000 = 250.000",
        all(v in text for v in ("1.000.000,00", "700.000,00", "50.000,00", "250.000,00")),
    )
    check(
        "memoria declara limitacoes e que nao definido nao equivale a zero",
        "Não equivale a zero" in text and "não está homologada" in text,
    )
    check("valor aberto fica na URL", "detalhe=calculo" in page.url)
    page.screenshot(path=str(SHOTS / "06-memoria-de-calculo.png"))

    with page.expect_download() as download:
        dialog.get_by_role("button", name="Exportar CSV").click()
    csv_path = Path(tmp) / "demonstrativo.csv"
    download.value.save_as(csv_path)
    exported = csv_path.read_text(encoding="utf-8-sig")
    check(
        "exportacao do demonstrativo reconcilia com a tela e preserva nao definido",
        "250000,00" in exported and "Receita da Evidia;não definido" in exported,
    )

    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()
    check("voltar da memoria restaura a URL do dossie", page.url == url_before, page.url)


def column_cells(page: Page, header: str, table: str = "Oportunidades em avaliação") -> list[str]:
    return page.evaluate(
        """([header, table]) => {
            const region = document.querySelector(`[role="region"][aria-label="${table}"]`);
            const heads = [...region.querySelectorAll('thead th')];
            const text = (th) => th.innerText.trim().toUpperCase();
            const index = heads.findIndex((th) => text(th).startsWith(header));
            if (index < 0) return [];
            return [...region.querySelectorAll('tbody tr')].map(
                (tr) => tr.children[index]?.innerText.trim() ?? ''
            );
        }""",
        [header.upper(), table],
    )


def settled(page: Page) -> None:
    """Espera a tabela comum terminar de buscar.

    O indicador aparece no mesmo render em que a consulta muda; por isso deve ser chamado
    depois de o efeito da mudanca (filtro ativo, ordenacao, tamanho de pagina) estar na tela.
    Esperar apenas rede ociosa retorna cedo demais e le a pagina anterior.
    """
    expect(page.get_by_text("Atualizando…")).to_have_count(0)


def filter_contains(page: Page, column: str, value: str) -> None:
    """Filtra uma coluna de texto pelo conteudo.

    O dossie sintetico e reaproveitado entre execucoes e acumula registros: sem filtrar, a
    linha desta execucao pode estar em outra pagina da tabela.
    """
    page.get_by_role("button", name=f"Filtrar {column}", exact=True).click()
    panel = page.get_by_role("dialog", name=f"Filtro de {column}")
    panel.get_by_label("Texto").fill(value)
    expect(page.get_by_text(f"{column}: contém “{value}”")).to_be_visible()
    page.keyboard.press("Escape")
    expect(panel).to_be_hidden()
    settled(page)


def common_table(page: Page, check: Check, base: str, run: str, tmp: str) -> None:
    """Tabela comum: ordenacao, filtros, selecao, colunas, visao salva e exportacao."""
    page.goto(f"{base}/operacao", wait_until="networkidle")
    region = page.get_by_role("region", name="Oportunidades em avaliação")
    expect(region).to_be_visible()
    metrics = region.evaluate(
        """el => ({
            maxHeight: getComputedStyle(el).maxHeight,
            overflowX: getComputedStyle(el).overflowX,
            sticky: getComputedStyle(el.querySelector('thead th')).position,
            viewport: window.innerHeight,
        })"""
    )
    check(
        "tabela comum: altura limitada, cabecalho sticky e rolagem horizontal propria",
        metrics["sticky"] == "sticky"
        and metrics["overflowX"] == "auto"
        and metrics["maxHeight"] == f"{metrics['viewport'] - 240}px",
        str(metrics),
    )

    region.get_by_role("button", name="Documentos", exact=True).click()
    expect(page.locator("th[aria-sort='ascending']")).to_have_count(1)
    settled(page)
    numbers = [int(v) for v in column_cells(page, "Documentos") if v.isdigit()]
    check(
        "ordenar por Documentos usa ordem numerica e fica na URL",
        numbers == sorted(numbers) and "tabela=" in page.url,
        str(numbers),
    )

    page.get_by_role("button", name="Filtrar Posição Avaliada").click()
    panel = page.get_by_role("dialog", name="Filtro de Posição Avaliada")
    expect(panel).to_be_visible()
    z = panel.evaluate("el => getComputedStyle(el).zIndex")
    in_body = panel.evaluate("el => el.parentElement === document.body")
    check(
        "filtro de coluna em portal no body, z-index 9999, dentro da janela",
        in_body and z == "9999" and inside_viewport(panel.bounding_box(), 1440, 900),
        f"z={z} body={in_body} box={panel.bounding_box()}",
    )
    panel.get_by_label("Autor").check()
    expect(page.get_by_text("Posição Avaliada: Autor")).to_be_visible()
    settled(page)
    sides = set(column_cells(page, "Posição Avaliada"))
    check("filtro mostra apenas a posicao escolhida", sides == {"Autor"}, str(sides))
    panel.get_by_label("Réu").check()
    expect(page.get_by_text("Posição Avaliada: Autor ou Réu")).to_be_visible()
    settled(page)
    check(
        "dois valores da mesma coluna combinam por OU",
        set(column_cells(page, "Posição Avaliada")) <= {"Autor", "Réu"},
    )
    panel.get_by_label("Réu").uncheck()
    page.keyboard.press("Escape")
    expect(panel).to_be_hidden()

    # Filtro da ultima coluna, com a janela baixa: o painel se ajusta as bordas.
    page.set_viewport_size({"width": 1440, "height": 520})
    page.get_by_role("button", name="Filtrar Atualizado").click()
    edge = page.get_by_role("dialog", name="Filtro de Atualizado")
    expect(edge).to_be_visible()
    check(
        "filtro perto das bordas direita e inferior permanece inteiro na janela",
        inside_viewport(edge.bounding_box(), 1440, 520),
        str(edge.bounding_box()),
    )
    page.keyboard.press("Escape")
    page.set_viewport_size({"width": 1440, "height": 900})

    # Selecao por ID: sobrevive a ordenacao e avisa quando sai da visao filtrada.
    page.get_by_role("checkbox", name="registros desta página").check()
    selection = page.get_by_role("region", name="Seleção")
    expect(selection).to_be_visible()
    select_all = selection.get_by_role("button", name="Selecionar Todos os")
    if select_all.count():
        select_all.click()
        expect(selection.get_by_text("todos os resultados filtrados")).to_be_visible()
    selected_before = selection.locator("span.font-medium").inner_text()
    region.get_by_role("button", name="Documentos", exact=True).click()
    settled(page)
    check(
        "selecao mantem a contagem depois de reordenar",
        selection.locator("span.font-medium").inner_text().split(" (")[0]
        == selected_before.split(" (")[0],
        selected_before,
    )
    page.get_by_role("button", name="Filtrar Posição Avaliada").click()
    panel.get_by_label("Autor").uncheck()
    panel.get_by_label("Réu").check()
    page.keyboard.press("Escape")
    outside = selection.get_by_text("com os filtros atuais")
    expect(outside).to_be_visible()
    check("mudar o filtro informa quantos selecionados sairam da visao", True)
    selection.get_by_role("button", name="Remover da Seleção").click()
    expect(selection).to_be_hidden()
    check("remover os que sairam da visao esvazia a selecao", True)

    # Colunas configuraveis e largura por teclado.
    page.get_by_role("button", name="Colunas").click()
    columns = page.get_by_role("dialog", name="Colunas da tabela")
    columns.get_by_role("checkbox", name="ID na Origem").check()
    check(
        "identificador minimo nao pode ser ocultado",
        columns.get_by_role("checkbox", name="Processo (CNJ)").is_disabled(),
    )
    page.keyboard.press("Escape")
    expect(region.get_by_role("columnheader", name="ID na Origem")).to_be_visible()
    check("coluna oculta por padrao passa a ser exibida", True)
    handle = page.get_by_role("separator", name="Largura da coluna Título")
    before = int(handle.get_attribute("aria-valuenow"))
    handle.focus()
    page.keyboard.press("ArrowRight")
    expect(handle).to_have_attribute("aria-valuenow", str(before + 16))
    check("largura da coluna ajustavel por teclado", True)

    # Visao salva reaparece ao entrar de novo na tabela.
    view_name = f"Visão {run}"
    page.get_by_role("button", name="Visões").click()
    views = page.get_by_role("dialog", name="Visões salvas")
    views.get_by_label("Salvar a visão atual como").fill(view_name)
    views.get_by_label("Abrir a tabela com esta visão").check()
    views.get_by_role("button", name="Salvar Visão").click()
    expect(views.get_by_text("Visão salva.")).to_be_visible()
    page.keyboard.press("Escape")
    page.screenshot(path=str(SHOTS / "07-tabela-comum.png"), full_page=True)

    page.goto(f"{base}/operacao", wait_until="networkidle")
    expect(page.get_by_text("Posição Avaliada: Réu")).to_be_visible()
    expect(region.get_by_role("columnheader", name="ID na Origem")).to_be_visible()
    check("visao salva como padrao reaparece ao entrar novamente", "tabela=" in page.url)

    # Voltar do dossie restaura filtros, ordenacao e colunas.
    list_url = page.url
    region.get_by_role("link").first.click()
    page.wait_for_url("**/operacao/*-*", timeout=15000)
    page.go_back()
    expect(page.get_by_text("Posição Avaliada: Réu")).to_be_visible()
    check("voltar do dossie restaura a consulta da lista", page.url == list_url, page.url)

    page.get_by_role("button", name="Exportar").click()
    export = page.get_by_role("dialog", name="Exportar tabela")
    with page.expect_download() as download:
        export.get_by_role("button", name="Exportar ").click()
    csv_path = Path(tmp) / "oportunidades.csv"
    download.value.save_as(csv_path)
    lines = csv_path.read_text(encoding="utf-8-sig").splitlines()
    shown = len(column_cells(page, "Posição Avaliada"))
    check(
        "exportacao traz as colunas da tela e apenas o resultado filtrado",
        lines[0].startswith("Processo (CNJ);")
        and "ID na Origem" in lines[0]
        and all(";Réu" in line for line in lines[1:])
        and len(lines) - 1 >= shown,
        lines[0],
    )
    page.keyboard.press("Escape")

    # Limpa a visao criada pelo roteiro e volta ao padrao.
    page.get_by_role("button", name="Visões").click()
    views.get_by_role("button", name=f"Excluir a visão {view_name}").click()
    views.get_by_role("button", name="Confirmar Exclusão").click()
    expect(views.get_by_text(view_name)).to_be_hidden()
    views.get_by_role("button", name="Restaurar Padrão").click()
    expect(page.get_by_text("Posição Avaliada: Réu")).to_be_hidden()
    check("excluir visao exige confirmacao; restaurar padrao limpa a consulta", True)

    page.get_by_label("Por página").select_option("10")
    expect(page.get_by_label("Por página")).to_have_value("10")
    settled(page)
    pager = page.get_by_role("navigation", name="Paginação de Oportunidades em avaliação")
    if "de 1" not in pager.inner_text():
        first_page = column_cells(page, "Processo")
        pager.get_by_role("button", name="Próxima").click()
        expect(pager.get_by_text("Página 2 de")).to_be_visible()
        settled(page)
        check(
            "paginacao no servidor: a segunda pagina traz outros registros",
            column_cells(page, "Processo") != first_page,
        )
    page.goto(f"{base}/operacao", wait_until="networkidle")


def query_of(url: str) -> dict[str, list[str]]:
    return parse_qs(urlsplit(url).query)


def dossier_tables(page: Page, check: Check, dossier_url: str, run: str, tmp: str) -> None:
    """Tabela comum nas tabelas do dossie: escopo, nova versao e filtros na URL."""
    docs_table = "Documentos do dossiê e suas versões"
    claims_table = "Afirmações do dossiê"
    title = f"Peça sintética {run}"
    page.goto(dossier_url, wait_until="networkidle")
    filter_contains(page, "Documento", run)
    filter_contains(page, "Afirmação", run)

    second = Path(tmp) / f"peca-sintetica-{run}-v2.pdf"
    second.write_bytes(make_pdf(4, f"peca sintetica {run} v2"))
    page.get_by_label(f"Arquivo da nova versão de {title}").set_input_files(str(second))
    expect(page.get_by_text("Versão 2 recebida.")).to_be_visible()
    settled(page)
    # O dossie sintetico acumula documentos de execucoes anteriores: olha-se o desta.
    docs = page.get_by_role("region", name=docs_table)
    mine = docs.get_by_role("row").filter(has_text=title)
    expect(mine).to_have_count(2)
    check(
        "nova versao vira linha propria e a anterior continua na tabela",
        "v2" in mine.nth(0).inner_text() and "v1" in mine.nth(1).inner_text(),
        mine.nth(0).inner_text(),
    )
    check(
        "enviar nova versao so e oferecido na versao vigente",
        mine.nth(0).get_by_role("button", name="Enviar Nova Versão").count() == 1
        and mine.nth(1).get_by_role("button", name="Enviar Nova Versão").count() == 0
        and mine.nth(1).get_by_role("link", name="Abrir original").count() == 1,
    )

    page.get_by_role("button", name="Filtrar Vigência").click()
    panel = page.get_by_role("dialog", name="Filtro de Vigência")
    panel.get_by_label("Atual").check()
    expect(page.get_by_text("Vigência: Atual")).to_be_visible()
    page.keyboard.press("Escape")
    expect(mine).to_have_count(1)
    validity = set(column_cells(page, "Vigência", docs_table))
    check(
        "filtro da tabela de documentos e resolvido no servidor e fica na URL",
        validity == {"Atual"} and "v2" in mine.inner_text() and "docs=" in page.url,
        f"{validity} {page.url}",
    )

    page.get_by_role("button", name="Filtrar Atualidade").click()
    panel = page.get_by_role("dialog", name="Filtro de Atualidade")
    panel.get_by_label("Desatualizada").check()
    expect(page.get_by_text("Atualidade: Desatualizada")).to_be_visible()
    page.keyboard.press("Escape")
    settled(page)
    row = page.get_by_role("row").filter(has_text=f"A autora alegou atraso ({run}).")
    expect(row).to_be_visible()
    stale = set(column_cells(page, "Atualidade", claims_table))
    check(
        "afirmacao da versao substituida aparece desatualizada; as duas consultas convivem na URL",
        stale == {"Desatualizada"} and "docs=" in page.url and "afirm=" in page.url,
        f"{stale} {page.url}",
    )

    before = query_of(page.url)
    row.get_by_role("button", name="Abrir Ficha").click()
    dialog = page.get_by_role("dialog", name="Ficha da Afirmação")
    expect(dialog).to_be_visible()
    opened = query_of(page.url)
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()
    check(
        "abrir e fechar a ficha preserva os filtros das duas tabelas",
        "detalhe" in opened
        and opened.get("docs") == before.get("docs")
        and query_of(page.url) == before,
        page.url,
    )

    stale_rows = column_cells(page, "Atualidade", claims_table)
    section = page.get_by_role("region", name="Afirmações e Revisão")
    section.get_by_role("button", name="Exportar").click()
    export = page.get_by_role("dialog", name="Exportar tabela")
    with page.expect_download() as download:
        export.get_by_role("button", name="Exportar ").click()
    csv_path = Path(tmp) / "afirmacoes.csv"
    download.value.save_as(csv_path)
    lines = csv_path.read_text(encoding="utf-8-sig").splitlines()
    check(
        "exportacao das afirmacoes traz apenas o resultado filtrado deste dossie",
        lines[0].startswith("Afirmação;")
        and len(lines) - 1 == len(stale_rows)
        and all("Desatualizada" in line for line in lines[1:])
        and any(run in line for line in lines[1:]),
        " | ".join(lines[:2]),
    )
    page.keyboard.press("Escape")
    page.screenshot(path=str(SHOTS / "08-tabelas-do-dossie.png"), full_page=True)

    clear = page.get_by_role("button", name="Limpar Filtros")
    clear.first.click()
    expect(clear).to_have_count(1)
    clear.first.click()
    expect(clear).to_have_count(0)
    check(
        "limpar os filtros devolve a URL do dossie ao padrao",
        "docs=" not in page.url and "afirm=" not in page.url,
        page.url,
    )

    # Paginacao na interface: so e exercitada quando o dossie tem mais de dez versoes.
    pager = page.get_by_role("navigation", name=f"Paginação de {docs_table}")
    pager.get_by_label("Por página").select_option("10")
    expect(pager.get_by_label("Por página")).to_have_value("10")
    settled(page)
    if "de 1" not in pager.inner_text():
        first_page = column_cells(page, "Hash", docs_table)
        pager.get_by_role("button", name="Próxima").click()
        expect(pager.get_by_text("Página 2 de")).to_be_visible()
        settled(page)
        second_page = column_cells(page, "Hash", docs_table)
        check(
            "paginacao no servidor: a segunda pagina de documentos traz outros registros",
            len(first_page) == 10 and second_page and not set(first_page) & set(second_page),
            f"{len(first_page)} + {len(second_page)}",
        )
    else:
        print("[--  ] paginacao na interface nao exercitada: menos de 11 versoes no dossie")


def engine_audit(
    page: Page, check: Check, dossier_url: str, run: str, tmp: str, console_errors: list[str]
) -> None:
    """Auditoria do Nulidade360 em modo simulado: so roda com a integracao em modo mock."""
    page.goto(dossier_url, wait_until="networkidle")
    form = page.get_by_role("form", name="Iniciar auditoria simulada")
    expect(form).to_be_visible()

    form.get_by_role("button", name="Iniciar Auditoria Simulada").click()
    expect(form.get_by_text("Escolha o documento a auditar.")).to_be_visible()
    expect(form.get_by_text("Confirme o lado: não há valor presumido.")).to_be_visible()
    check(
        "auditoria sem documento ou sem lado mostra os erros nos campos, sem lado presumido", True
    )

    title = f"Laudo texto {run}"
    filename = f"laudo-{run}.txt"
    text_path = Path(tmp) / filename
    text_path.write_text(f"LAUDO SINTÉTICO {run}\nNenhum dado real.\n", encoding="utf-8")
    page.get_by_label("Arquivo", exact=True).set_input_files(str(text_path))
    page.get_by_label("Título").fill(title)
    page.get_by_role("button", name="Enviar Documento").click()
    expect(page.get_by_text("Versão 1 recebida.")).to_be_visible()

    # A lista de documentos e atualizada depois da resposta do envio.
    expect(
        form.get_by_label("Documento a auditar").locator("option").filter(has_text=title)
    ).to_have_count(1)
    options = form.get_by_label("Documento a auditar").locator("option").all_inner_texts()
    check(
        "so documentos de texto vigentes sao oferecidos ao modo simulado",
        any(title in option for option in options)
        and not any(".pdf" in option.lower() for option in options),
        str(options),
    )
    form.get_by_label("Documento a auditar").select_option(label=f"{title} · v1 · {filename}")
    form.get_by_label("Réu", exact=True).check()
    form.get_by_role("button", name="Iniciar Auditoria Simulada").click()

    refused = form.get_by_text("não configurada")
    card = page.get_by_role("article").filter(has_text=title)
    expect(refused.or_(card).first).to_be_visible(timeout=20000)
    if refused.count():
        print("[--  ] auditoria simulada nao exercitada: integracao do Nulidade360 desligada")
        return

    expect(card.get_by_text("Concluída")).to_be_visible(timeout=45000)
    body = card.inner_text()
    check(
        "execucao acompanha o motor ate concluir e fica rotulada como modo simulado",
        "Modo simulado" in body and "de 14 concluídos" in body and "Réu" in body,
        body[:300],
    )
    check(
        "custo desconhecido aparece como nao informado, nunca zero",
        "Não informado pelo motor" in body,
    )

    url_before = page.url
    card.get_by_role("button", name="Achado").click()
    dialog = page.get_by_role("dialog", name="Achados da Execução")
    expect(dialog).to_be_visible()
    expect(dialog.get_by_text("Sem citação resolvível.").first).to_be_visible()
    box = dialog.bounding_box()
    check(
        "achados abrem em tela inteira com Voltar no topo e o detalhe na URL",
        box is not None
        and round(box["width"]) == 1440
        and round(box["height"]) == 900
        and dialog.get_by_role("button", name="Voltar").count() == 1
        and "detalhe=motor" in page.url,
        str(box),
    )
    content = dialog.inner_text()
    check(
        "achado sem pagina de origem fica pendente; indice e rotulado como risco, nao exito",
        "Pendente de evidência" in content
        and "não é estimativa de êxito" in content
        and "Modo simulado." in content,
    )
    dialog.locator("summary").first.click()
    expect(dialog.locator("pre").first).to_contain_text("human_status")
    check("saida original do motor fica consultavel no achado", True)
    # Revisao do achado: dado de teste nao pode ser validado; descartar exige fundamento.
    review = dialog.get_by_role("form", name=re.compile("^Revisar achado")).first
    mark = len(console_errors)
    review.get_by_label("Estado da revisão").select_option("validated")
    review.get_by_label("Fundamento da revisão").fill("Tentativa de validar dado de teste.")
    review.get_by_role("button", name="Registrar Revisão").click()
    blocked = review.get_by_role("alert")
    expect(blocked).to_be_visible()
    check(
        "achado de modo simulado nao pode ser validado e a tela diz por que",
        "modo simulado" in blocked.inner_text() and "pendente de evidência" in blocked.inner_text(),
        blocked.inner_text()[:300],
    )
    review.get_by_label("Estado da revisão").select_option("discarded")
    review.get_by_label("Fundamento da revisão").fill("")
    review.get_by_role("button", name="Registrar Revisão").click()
    expect(review.get_by_text("Informe o fundamento da revisão")).to_be_visible()
    review.get_by_label("Fundamento da revisão").fill("Dado de teste do motor.")
    review.get_by_role("button", name="Registrar Revisão").click()
    expect(dialog.get_by_text("Pendente → Descartada")).to_be_visible()
    expect(dialog.get_by_text("Revisão: Descartada")).to_be_visible()
    check("descartar exige fundamento e fica no historico com antes e depois", True)
    # As duas recusas acima (409 e 422) sao respostas esperadas; qualquer outro erro de
    # console continua contando.
    expected = [
        entry
        for entry in console_errors[mark:]
        if "status of 409" in entry or "status of 422" in entry
    ]
    check(
        "as recusas do servidor na revisao sao exatamente as duas esperadas",
        len(expected) == 2,
        str(console_errors[mark:]),
    )
    for entry in expected:
        console_errors.remove(entry)
    page.screenshot(path=str(SHOTS / "09-achados-do-motor.png"))
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()
    check("voltar dos achados restaura a URL do dossie", page.url == url_before, page.url)


def scanned_png(text_value: str) -> bytes | None:
    """Imagem com texto, para exercitar o OCR. None se a fonte de teste nao existir."""
    import io

    from PIL import Image, ImageDraw, ImageFont

    font = Path("C:/Windows/Fonts/arial.ttf")
    if not font.is_file():
        return None
    image = Image.new("RGB", (1400, 300), "white")
    ImageDraw.Draw(image).text(
        (40, 100), text_value, fill="black", font=ImageFont.truetype(str(font), 64)
    )
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def document_text(
    page: Page, check: Check, dossier_url: str, run: str, tmp: str, console_errors: list[str]
) -> None:
    """Texto por pagina, estrutura do documento, sugestoes, evidencias e OCR."""
    page.goto(dossier_url, wait_until="networkidle")
    title = f"Peça texto {run}"
    text_path = Path(tmp) / f"peca-texto-{run}.txt"
    text_path.write_text(
        f"A autora alegou que a entrega atrasou noventa dias ({run}).\n"
        "\f"
        "A ré sustentou que o atraso decorreu de caso fortuito, sem culpa sua.\n",
        encoding="utf-8",
    )
    page.get_by_label("Arquivo", exact=True).set_input_files(str(text_path))
    page.get_by_label("Título").fill(title)
    page.get_by_role("button", name="Enviar Documento").click()
    expect(page.get_by_text("Versão 1 recebida.")).to_be_visible()
    filter_contains(page, "Documento", run)

    row = page.get_by_role("row").filter(has_text=title)
    row.get_by_role("button", name="Texto e estrutura").click()
    dialog = page.get_by_role("dialog", name="Texto e Estrutura do Documento")
    expect(dialog).to_be_visible()
    box = dialog.bounding_box()
    reader = dialog.get_by_label("Texto da página 1")
    expect(reader).to_contain_text("A autora alegou")
    check(
        "documento abre em tela inteira com o texto extraido por pagina",
        box is not None
        and round(box["width"]) == 1440
        and "detalhe=documento" in page.url
        and "Arquivo de texto" in dialog.inner_text(),
    )
    dialog.get_by_label("Página do arquivo").first.select_option("2")
    expect(dialog.get_by_label("Texto da página 2")).to_contain_text("caso fortuito")
    check("trocar de pagina mostra o texto daquela pagina", True)

    mapping = dialog.get_by_role("form", name="Mapear peça do documento")
    mapping.get_by_label("Peça").fill(f"Petição inicial {run}")
    mapping.get_by_label("Página inicial").fill("1")
    mapping.get_by_label("Página final").fill("2")
    mapping.get_by_label("Folha inicial").fill("10")
    mapping.get_by_role("button", name="Mapear Peça").click()
    expect(dialog.get_by_text("folhas 10–11")).to_be_visible()
    expect(dialog.get_by_text("Folha do processo: 11")).to_be_visible()
    check("estrutura mapeia pagina do arquivo para folha do processo", True)

    dialog.get_by_role("button", name="Sugerir por Regras").click()
    first = dialog.get_by_role("button", name="Registrar como Afirmação").first
    expect(first).to_be_visible()
    check(
        "sugestoes por regras citam a pagina e nada e gravado ao sugerir",
        "Página 1" in dialog.inner_text() and "Confiança da extração" in dialog.inner_text(),
    )
    first.click()
    expect(dialog.get_by_role("button", name="Registrada como Pendente")).to_be_visible()

    mark = len(console_errors)
    dialog.get_by_role("button", name="Sugerir com Modelo").click()
    refused = dialog.get_by_text("Modelo de linguagem não configurado")
    simulated = dialog.get_by_text("Modelo em modo simulado.")
    expect(refused.or_(simulated).first).to_be_visible()
    check("modelo desligado e informado sem esconder a opcao por regras", True)
    for entry in [e for e in console_errors[mark:] if "status of 503" in e]:
        console_errors.remove(entry)  # recusa esperada com o modelo desligado
    page.screenshot(path=str(SHOTS / "10-texto-e-estrutura.png"))
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()

    # A afirmacao aceita nasce pendente, com a origem registrada, e recebe evidencia contraria.
    filter_contains(page, "Afirmação", run)
    claim = page.get_by_role("row").filter(has_text="a entrega atrasou noventa dias")
    claim.get_by_role("button", name="Abrir Ficha").click()
    sheet = page.get_by_role("dialog", name="Ficha da Afirmação")
    expect(sheet.get_by_text("Sugestão por regras locais, aceita por uma pessoa")).to_be_visible()
    evidence = sheet.get_by_role("form", name="Registrar evidência da afirmação")
    evidence.get_by_label("Posição da evidência").select_option("contrary")
    evidence.get_by_label("Documento", exact=True).select_option(label=f"{title} · v1")
    evidence.get_by_label("Página do arquivo").fill("2")
    evidence.get_by_label("O que a página mostra").fill("A ré atribui o atraso a caso fortuito.")
    evidence.get_by_role("button", name="Registrar Evidência").click()
    expect(sheet.get_by_text("A ré atribui o atraso a caso fortuito.")).to_be_visible()
    check(
        "evidencia contraria fica registrada e a afirmacao continua pendente",
        "Contrária" in sheet.inner_text() and "Pendente" in sheet.inner_text(),
    )
    sheet.get_by_role("button", name="Voltar").click()
    expect(sheet).to_be_hidden()

    # OCR local: imagem digitalizada vira texto, sem servico externo.
    image = scanned_png(f"LAUDO PERICIAL {run.upper()}")  # unica por execucao
    if image is None:
        print("[--  ] OCR na interface nao exercitado: fonte de teste ausente")
        return
    image_path = Path(tmp) / f"foto-{run}.png"
    image_path.write_bytes(image)
    page.get_by_label("Arquivo", exact=True).set_input_files(str(image_path))
    page.get_by_label("Título").fill(f"Foto {run}")
    page.get_by_role("button", name="Enviar Documento").click()
    expect(page.get_by_text("Versão 1 recebida.")).to_be_visible()
    settled(page)
    photo = page.get_by_role("row").filter(has_text=f"Foto {run}")
    expect(photo.get_by_text("Requer OCR")).to_be_visible()
    photo.get_by_role("button", name="Texto e estrutura").click()
    expect(dialog).to_be_visible()
    button = dialog.get_by_role("button", name="Executar OCR")
    if not button.is_enabled():
        print("[--  ] OCR na interface nao exercitado: Tesseract indisponivel no servidor")
    else:
        button.click()
        expect(dialog.get_by_label("Texto da página 1")).to_contain_text("LAUDO", timeout=60000)
        check(
            "OCR local le o documento digitalizado e identifica a origem do texto",
            "OCR (leitura aproximada)" in dialog.inner_text(),
        )
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()


def diligence(
    page: Page, check: Check, dossier_url: str, run: str, tmp: str, console_errors: list[str]
) -> None:
    """Diligencia de vinculos: identidade, fonte consultada, cruzamentos e ocorrencia."""
    page.goto(dossier_url, wait_until="networkidle")
    expert = f"Perito Sintético Um {run}"
    page.get_by_role("button", name="Abrir Diligência").click()
    dialog = page.get_by_role("dialog", name="Vínculos e Qualificação")
    expect(dialog).to_be_visible()
    box = dialog.bounding_box()
    check(
        "diligencia abre em tela inteira com a aba na URL",
        box is not None and round(box["width"]) == 1440 and "detalhe=diligencia" in page.url,
    )

    form = dialog.get_by_role("form", name="Cadastrar participante")
    form.get_by_label("Nome").fill(expert)
    form.get_by_label("Identificador").select_option("crea")
    form.get_by_label("Número").fill("000001")
    form.get_by_label("UF").fill("sp")
    form.get_by_role("button", name="Cadastrar Participante").click()
    card = dialog.get_by_role("article", name=f"Participante {expert}")
    expect(card).to_be_visible()
    check(
        "participante nasce com identidade nao confirmada",
        "Identidade não confirmada" in card.inner_text() and "CREA 000001/SP" in card.inner_text(),
    )

    roles = card.get_by_role("form", name=f"Registrar atuação de {expert}")
    roles.get_by_label("Papel").select_option("court_expert")
    roles.get_by_label("Lado").select_option("court")
    roles.get_by_role("button", name="Registrar Atuação").click()
    expect(card.get_by_text("Ato sem data")).to_be_visible()

    card.get_by_role("button", name="Consultar Fonte").click()
    refused = card.get_by_text("Nenhuma fonte de diligência configurada")
    answered = card.get_by_text("Fonte sintética de teste")
    expect(refused.or_(answered).first).to_be_visible(timeout=20000)
    if refused.count():
        for entry in [e for e in console_errors if "status of 503" in e]:
            console_errors.remove(entry)
        print("[--  ] diligencia com fonte nao exercitada: EVIDIA_DILIGENCE_MODE desligado")
        dialog.get_by_role("button", name="Voltar").click()
        return
    check(
        "consulta a fonte declara quantos registros trouxe e a cobertura",
        "4 registros" in card.inner_text() and "não é integral" in card.inner_text(),
    )

    dialog.get_by_role("tab", name="Cruzamentos").click()
    block = dialog.get_by_role("article", name=f"Cruzamentos de {expert}")
    expect(block).to_be_visible()
    content = block.inner_text()
    check(
        "recorrencia mostra contagem e base consultada, sem qualificar a frequencia",
        "Magistrado Sintético Um" in content
        and "2 processos de 2 processos consultados" in content
        and "anormal" not in content.lower()
        and "suspei" not in content.lower(),
        content[:400],
    )
    check(
        "atuacao na janela em processo distribuido antes dela e contada pela data do ato",
        "processo distribuído antes da janela; conta a data do ato" in content
        and "Fora da janela" in content
        and "Sem data" in content,
    )
    limits = dialog.inner_text()
    check(
        "limites da leitura declaram cobertura da fonte e identidade nao confirmada",
        "filtra pela data de distribuição" in limits
        and "identidade ainda não confirmada" in limits,
    )

    dialog.get_by_role("tab", name="Ocorrências").click()
    found = f"Perito e magistrado atuaram no mesmo processo ({run})."
    new = dialog.get_by_role("form", name="Registrar ocorrência")
    new.get_by_label("Profissional").select_option(label=expert)
    new.get_by_label("Relacionado (opcional)").select_option(label="Magistrado Sintético Um")
    new.get_by_label("Endereço da fonte original").fill("https://exemplo.invalid/ato")
    new.get_by_label("O que foi encontrado").fill(found)
    new.get_by_role("button", name="Registrar Ocorrência").click()
    item = dialog.get_by_role("article").filter(has_text=found)
    expect(item).to_be_visible()
    check("ocorrencia nasce com identidade pendente", "Identidade pendente" in item.inner_text())

    mark = len(console_errors)
    review = item.get_by_role("form")
    review.get_by_label("Situação").select_option("validated")
    review.get_by_label("Fundamento da revisão").fill("Tentativa antes de confirmar a identidade.")
    review.get_by_role("button", name="Registrar Revisão").click()
    blocked = review.get_by_role("alert")
    expect(blocked).to_be_visible()
    check(
        "ocorrencia nao e validada sem identidade confirmada",
        "identidade do profissional ainda não foi confirmada" in blocked.inner_text(),
    )
    for entry in [e for e in console_errors[mark:] if "status of 409" in e]:
        console_errors.remove(entry)  # recusa esperada

    dialog.get_by_role("tab", name="Participantes").click()
    card.get_by_text("Identidade e união de fichas").click()
    identity = card.get_by_role("form", name=f"Confirmar identidade de {expert}")
    identity.get_by_label("Com base em que a identidade foi confirmada").fill(
        "CREA conferido na certidão."
    )
    identity.get_by_role("button", name="Confirmar Identidade").click()
    expect(card.get_by_text("Identidade confirmada", exact=True)).to_be_visible()

    dialog.get_by_role("tab", name="Ocorrências").click()
    review = item.get_by_role("form")
    review.get_by_label("Situação").select_option("validated")
    review.get_by_label("Fundamento da revisão").fill("Ato de nomeação conferido na fonte.")
    review.get_by_role("button", name="Registrar Revisão").click()
    expect(item.get_by_text("Validada", exact=True).first).to_be_visible()
    check("com identidade e fonte, a ocorrencia e validada com fundamento e historico", True)

    with page.expect_download() as download:
        dialog.get_by_role("button", name="Exportar Dossiê (CSV)").click()
    path = Path(tmp) / "diligencia.csv"
    download.value.save_as(path)
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    mine = [line for line in lines if run in line]
    check(
        "dossie exportado traz a ficha e a situacao de cada ocorrencia",
        lines[0].startswith("Situação;Tipo;Profissional") and any("Validada" in m for m in mine),
        lines[0],
    )
    page.screenshot(path=str(SHOTS / "11-diligencia.png"))
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()


def contradictory(
    page: Page, check: Check, dossier_url: str, run: str, console_errors: list[str]
) -> None:
    """Contraditorio: pedido, cenario de um lado e comparacao com o outro nao analisado."""
    page.goto(dossier_url, wait_until="networkidle")
    author, defendant = f"Autora Sintética {run}", f"Ré Sintética {run}"
    page.get_by_role("button", name="Abrir Diligência").click()
    people = page.get_by_role("dialog", name="Vínculos e Qualificação")
    form = people.get_by_role("form", name="Cadastrar participante")
    for name in (author, defendant):
        form.get_by_label("Nome").fill(name)
        form.get_by_role("button", name="Cadastrar Participante").click()
        expect(people.get_by_role("article", name=f"Participante {name}")).to_be_visible()
    people.get_by_role("button", name="Voltar").click()
    expect(people).to_be_hidden()

    page.get_by_role("button", name="Abrir Contraditório").click()
    dialog = page.get_by_role("dialog", name="Contraditório Bilateral")
    expect(dialog).to_be_visible()
    box = dialog.bounding_box()
    check(
        "contraditorio abre em tela inteira com o detalhe na URL",
        box is not None and round(box["width"]) == 1440 and "detalhe=contraditorio" in page.url,
    )

    title = f"Indenização por atraso {run}"
    plea_form = dialog.get_by_role("form", name="Cadastrar pedido")
    plea_form.get_by_label("Pedido").fill(title)
    plea_form.get_by_role("group", name="Quem pede (autores)").get_by_label(author).check()
    plea_form.get_by_role("group", name="Contra quem (réus)").get_by_label(defendant).check()
    plea_form.get_by_role("button", name="Cadastrar Pedido").click()
    card = dialog.get_by_role("article", name=f"Pedido {title}")
    expect(card).to_be_visible()
    # A comparacao e carregada depois do cartao.
    expect(card.get_by_text("Sem cenário analisado")).to_have_count(2)
    check(
        "pedido novo mostra os dois lados como nao analisados, sem numero substituto",
        card.inner_text().count("Sem cenário analisado") == 2
        and "Comparação indisponível" in card.inner_text(),
    )

    create = card.get_by_role("form", name=f"Criar cenário para {title}")
    create.get_by_label("Participante a defender").select_option(label=f"{author} (autor)")
    create.get_by_role("button", name="Criar Cenário").click()
    scenario = card.get_by_role("region", name=f"Cenário de {author}")
    expect(scenario).to_be_visible()

    argue = scenario.get_by_role("form", name=f"Registrar argumento de {author}")
    argue.get_by_label("Argumento").fill("Tese ainda sem documento.")
    argue.get_by_role("button", name="Registrar Argumento").click()
    expect(scenario.get_by_text("Hipótese a validar")).to_be_visible()

    argue.get_by_label("Argumento").fill("O atraso foi alegado na inicial.")
    argue.get_by_label("Documento que sustenta (opcional)").select_option(
        label=f"Peça texto {run} · v1"
    )
    argue.get_by_label("Página do arquivo").fill("1")
    argue.get_by_label("Trecho citado (opcional)").fill("a entrega atrasou noventa dias")
    argue.get_by_role("button", name="Registrar Argumento").click()
    expect(scenario.get_by_text("Com evidência")).to_be_visible()
    check(
        "argumento sem documento e hipotese; com pagina e trecho conferidos tem evidencia",
        "Sem citação resolvível" in scenario.inner_text(),
    )

    argue.get_by_role("button", name="Concluir Cenário").click()
    # A comparacao so muda de "em elaboracao" para "concluido" depois da resposta do servidor.
    expect(card.get_by_text("Concluído", exact=True)).to_be_visible()
    summary = card.inner_text()
    check(
        "AC07 na tela: autor concluido e reu nao analisado, comparacao indisponivel",
        "Concluído" in summary
        and summary.count("Sem cenário analisado") == 1
        and "Comparação indisponível" in summary
        and "réu não analisado" in summary,
        summary[:400],
    )

    mark = len(console_errors)
    create.get_by_label("Participante a defender").select_option(label=f"{defendant} (réu)")
    create.get_by_label("Como montar").select_option("model")
    create.get_by_role("button", name="Criar Cenário").click()
    refused = card.get_by_text("Modelo de linguagem não configurado")
    generated = card.get_by_role("region", name=f"Cenário de {defendant}")
    expect(refused.or_(generated).first).to_be_visible(timeout=20000)
    check("gerar cenario pelo modelo desligado informa e nao cria cenario vazio", True)
    for entry in [e for e in console_errors[mark:] if "status of 503" in e]:
        console_errors.remove(entry)  # recusa esperada com o modelo desligado
    page.screenshot(path=str(SHOTS / "12-contraditorio.png"))
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()


def p4_report(run: str) -> bytes:
    """Relatorio SINTETICO no formato de tres abas do P4. Nenhum motor foi executado."""
    import io

    from openpyxl import Workbook

    wb = Workbook()
    provas = wb.active
    provas.title = "Provas"
    provas.append(["Bloco", "TipoProva", "Resumo", "Referencia", "Conteudo"])
    provas.append(["1.01", "Documental", f"Contrato sintético {run}", "fls. 1", "{}"])
    provas.append(["1.01", "Pericial", f"Laudo sintético {run}", "pág. 40", "{}"])
    provas.append(["1.02", "Testemunhal", f"Depoimento sintético {run}", "conforme os autos", "{}"])
    quesitos = wb.create_sheet("Quesitos")
    quesitos.append(["Bloco", "Quesito"])
    quesitos.append(["1.01", f"O contrato previa prazo? ({run})"])
    respostas = wb.create_sheet("Respostas")
    respostas.append(
        [
            "Bloco",
            "Quesito",
            "RespostaTecnica",
            "StatusTecnico",
            "JustificativaTecnica",
            "Observacoes",
        ]
    )
    respostas.append(
        [
            "1.01",
            f"O contrato previa prazo? ({run})",
            "Sim, 90 dias.",
            "Respondido",
            "Cláusula 3.",
            None,
        ]
    )
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def p4_and_findings(page: Page, check: Check, dossier_url: str, run: str, tmp: str) -> None:
    """Importacao do relatorio do P4 e achados do motor na tabela comum."""
    page.goto(dossier_url, wait_until="networkidle")
    title = f"Relatório P4 {run}"
    report_path = Path(tmp) / f"relatorio-p4-{run}.xlsx"
    report_path.write_bytes(p4_report(run))
    page.get_by_label("Arquivo", exact=True).set_input_files(str(report_path))
    page.get_by_label("Título").fill(title)
    page.get_by_role("button", name="Enviar Documento").click()
    expect(page.get_by_text("Versão 1 recebida.")).to_be_visible()

    form = page.get_by_role("form", name="Importar relatório do P4")
    form.get_by_role("button", name="Importar Relatório").click()
    expect(form.get_by_text("nada é presumido")).to_be_visible()
    check("importar relatorio sem lado ou documento e recusado na tela, sem valor presumido", True)

    form.get_by_label("Relatório do P4 (.xlsx)").select_option(label=f"{title} · v1")
    form.get_by_label("Documento que o P4 analisou").select_option(label=f"Peça texto {run} · v1")
    form.get_by_label("Réu", exact=True).check()
    form.get_by_role("button", name="Importar Relatório").click()
    expect(form.get_by_text("Relatório importado.")).to_be_visible()
    section = page.get_by_role("region", name="Provas, Quesitos e Respostas (P4)")
    expect(section.get_by_text("ocorreu fora da Evidia").first).to_be_visible()
    check(
        "relatorio importado declara que a execucao ocorreu fora e o que o relatorio nao informa",
        "ocorreu fora da Evidia" in section.inner_text()
        and "Não informada pelo relatório" in section.inner_text(),
    )

    section.get_by_role("button", name="Ver Itens do P4").click()
    dialog = page.get_by_role("dialog", name="Itens do P4")
    expect(dialog).to_be_visible()
    filter_contains(page, "Prova ou Quesito", run)
    table = "Itens do P4"
    pages = column_cells(page, "Página", table)
    pendings = column_cells(page, "Pendências", table)
    check(
        "paginas do P4 sao conferidas: uma citada, uma inexistente e uma sem pagina",
        "detalhe=p4" in page.url
        and sorted(pages) == sorted(["1", "40", "—\nVazio", "—\nVazio", "—\nVazio"])
        and sorted(pendings) == ["0", "0", "0", "1", "1"],
        f"{pages} {pendings}",
    )
    page.screenshot(path=str(SHOTS / "13-itens-do-p4.png"))
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()

    page.get_by_role("button", name="Achados em Tabela").click()
    findings = page.get_by_role("dialog", name="Achados do Motor")
    expect(findings).to_be_visible()
    expect(findings.get_by_role("button", name="Abrir Execução").first).to_be_visible()
    modes = set(column_cells(page, "Modo do Motor", "Achados do motor"))
    check(
        "achados do motor na tabela comum, rotulados como de execucao simulada",
        modes == {"Simulado"} and "detalhe=achados" in page.url,
        str(modes),
    )
    findings.get_by_role("button", name="Abrir Execução").first.click()
    expect(page.get_by_role("dialog", name="Achados da Execução")).to_be_visible()
    check("da tabela de achados abre-se a execucao que gerou o achado", "detalhe=motor" in page.url)
    page.get_by_role("dialog", name="Achados da Execução").get_by_role(
        "button", name="Voltar"
    ).click()


def economics_impacts(page: Page, check: Check, dossier_url: str, run: str, tmp: str) -> None:
    """Impactos com grupo de dependencia, sensibilidade e memorando versionado."""
    page.goto(dossier_url, wait_until="networkidle")
    page.get_by_role("tab", name="Recebimento do Autor").click()
    label = f"Procedência {run}"
    page.get_by_label("Nome do cenário").fill(label)
    page.get_by_label("Recebimento bruto (R$)").fill("1.000.000")
    page.get_by_label("Prazo (anos)").fill("2")
    page.get_by_label("Taxa de desconto (% a.a.)").fill("10")
    page.get_by_label("Taxa aprovada por").fill(f"Comitê {run}")
    page.get_by_label("Responsável pelo valor").fill(f"Analista {run}")
    page.get_by_label("Confiança no valor").select_option(label="Média")

    add = page.get_by_role("button", name="Adicionar Impacto")
    add.click()
    add.click()
    page.get_by_role("button", name="Calcular Recebimento do Autor").click()
    expect(page.get_by_text("Informe a causa (grupo de dependência).").first).to_be_visible()
    check("impacto sem descricao, causa ou valor e apontado no campo", True)

    names = page.get_by_label("Impacto", exact=True)
    groups = page.get_by_label("Causa (grupo de dependência)")
    amounts = page.get_by_label("Variação (R$, com sinal)")
    names.nth(0).fill(f"Nulidade da citação {run}")
    groups.nth(0).fill("citacao")
    amounts.nth(0).fill("-100.000")
    names.nth(1).fill(f"Mesmo vício em outra peça {run}")
    groups.nth(1).fill("citacao")
    amounts.nth(1).fill("-60.000")

    source = page.get_by_label("Fonte no dossiê").nth(0)
    options = source.locator("option").all_inner_texts()
    check(
        "seletor de fonte oferece premissa manual e so fontes validadas do dossie",
        options[0] == "Premissa manual (sem fonte)"
        and len(options) > 1
        and all(o.startswith(("Afirmação:", "Achado:", "Ocorrência:")) for o in options[1:]),
        str(options[:4]),
    )
    source.select_option(index=1)
    page.get_by_role("button", name="Calcular Recebimento do Autor").click()

    value = page.get_by_role(
        "button", name=f"Abrir memória de cálculo de recebimento líquido do cenário {label}"
    ).first
    expect(value).to_be_visible()
    check(
        "impactos da mesma causa nao se somam: 1.000.000 - 100.000 = 900.000",
        "900.000,00" in value.inner_text(),
        value.inner_text(),
    )
    value.click()
    dialog = page.get_by_role("dialog", name=label)
    expect(dialog).to_be_visible()
    impacts = dialog.get_by_role("region", name="Impactos do cenário").inner_text()
    check(
        "memoria mostra o impacto aplicado, o nao aplicado com motivo e a fonte validada",
        "Aplicado" in impacts
        and "Não aplicado" in impacts
        and "Mesma causa de outro impacto já aplicado" in impacts
        and "validad" in impacts,
        impacts[:300],
    )
    components = dialog.get_by_role("region", name="Componentes do cálculo").inner_text()
    check(
        "componentes trazem responsavel e confianca",
        f"Analista {run}" in components and "Média" in components,
    )
    sensitivity = dialog.get_by_role("region", name="Sensibilidade do cenário").inner_text()
    # 900.000 em 2 anos a 10%: 743.801,65; com +1 ano: 676.183,32.
    check(
        "sensibilidade varia uma premissa por vez e reconcilia com a conta feita a mao",
        "743.801,65" in dialog.inner_text()
        and "676.183,32" in sensitivity
        and "+10%" in sensitivity
        and "+1 p.p." in sensitivity,
        sensitivity[:300],
    )
    metrics = dialog.get_by_role("region", name="Impactos do cenário").evaluate(
        "el => getComputedStyle(el.querySelector('thead th')).position"
    )
    check("tabela de impactos com cabecalho fixo", metrics == "sticky", metrics)
    page.screenshot(path=str(SHOTS / "14-impactos-e-sensibilidade.png"), full_page=True)
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()

    card = page.locator("article").filter(has_text=label).first
    card.get_by_role("button", name="Emitir Memorando").click()
    expect(card.get_by_text("emitido.")).to_be_visible()
    memos = page.get_by_role("list", name="Memorandos Emitidos")
    expect(memos).to_be_visible()
    first = memos.get_by_role("listitem").first
    version = first.inner_text().split("Memorando Econômico v")[1].split()[0]
    first.get_by_text(f"Ler o memorando v{version}").click()
    body = first.locator("pre").inner_text()
    check(
        "memorando versionado declara limitacoes, impactos e o valor do demonstrativo",
        f"versão {version}" in body
        and "não homologada" in body
        and "900.000,00" in body
        and "não aplicado — mesma causa" in body
        and "não definidos (sem contrato)" in body,
        body[:200],
    )
    with page.expect_download() as download:
        first.get_by_role("button", name=f"Baixar memorando versão {version}").click()
    memo_path = Path(tmp) / "memorando.md"
    download.value.save_as(memo_path)
    check(
        "memorando baixado e o mesmo texto da tela",
        memo_path.read_text(encoding="utf-8").strip() == body.strip(),
    )
    page.screenshot(path=str(SHOTS / "15-memorando.png"), full_page=True)


def stages_and_decision(page: Page, check: Check, base: str, dossier_url: str, run: str) -> None:
    """Navegacao pelas seis etapas, decisao do memorando e URL antiga (RF15)."""
    page.goto(dossier_url, wait_until="networkidle")
    nav = page.get_by_role("navigation", name="Etapas da avaliação")
    # Sete botoes de etapa (visao completa + seis etapas); o de ajuda fica fora da lista.
    expect(nav.get_by_role("listitem").get_by_role("button")).to_have_count(7)
    labels = nav.inner_text()
    check(
        "dossie mostra as seis etapas com estado ao lado de cada uma",
        all(
            title in labels
            for title in (
                "1. Entrada do ativo",
                "2. Estruturação e rastreabilidade",
                "3. Motores de inteligência",
                "4. Contraditório: autor e réu",
                "5. Avaliação econômica",
                "6. Decisão e negociação",
            )
        )
        and "Aguardando revisão" in labels,
        labels[:200],
    )
    cnj = page.locator("header").filter(has_text="Processo (CNJ)").first.inner_text()

    nav.get_by_role("button", name="5. Avaliação econômica").click()
    expect(page.get_by_role("region", name="Estado da etapa 5")).to_be_visible()
    check(
        "etapa aberta fica na URL e mostra so as secoes dela, com o mesmo caso no cabecalho",
        "etapa=5" in page.url
        and page.get_by_role("heading", name="Demonstrativos Econômicos").count() == 1
        and page.get_by_role("region", name="Documentos do dossiê e suas versões").count() == 0
        and page.locator("header").filter(has_text="Processo (CNJ)").first.inner_text() == cnj,
        page.url,
    )
    value = page.get_by_role(
        "button",
        name=f"Abrir memória de cálculo de recebimento líquido do cenário Procedência {run}",
    ).first
    value.click()
    dialog = page.get_by_role("dialog", name=f"Procedência {run}")
    expect(dialog).to_be_visible()
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()
    check("voltar do detalhe mantem a etapa aberta", "etapa=5" in page.url, page.url)
    page.screenshot(path=str(SHOTS / "16-etapa-5.png"), full_page=True)

    nav.get_by_role("button", name="6. Decisão e negociação").click()
    expect(page.get_by_role("heading", name="Decisão e Memorandos")).to_be_visible()
    pendings = page.get_by_role("list", name="Pendências por etapa")
    check(
        "etapa 6 consolida as pendencias das etapas anteriores",
        pendings.count() == 1 and "1. Entrada do ativo" in pendings.inner_text(),
    )
    memos = page.get_by_role("list", name="Memorandos Emitidos")
    form = memos.get_by_role("form").first
    form.get_by_role("button", name="Aprovar Memorando").click()
    expect(form.get_by_text("Informe o fundamento")).to_be_visible()
    check("decisao sem fundamento e recusada na tela", True)
    form.get_by_label("Fundamento da decisão").fill(f"Premissas conferidas ({run}).")
    form.get_by_role("button", name="Aprovar Memorando").click()
    first = memos.get_by_role("listitem").first
    expect(first.get_by_text(f"Premissas conferidas ({run}).")).to_be_visible()
    expect(nav.get_by_role("button", name="6. Decisão e negociação")).to_contain_text("Concluída")
    check(
        "memorando aprovado registra fundamento, nao aceita nova decisao e conclui a etapa 6",
        first.get_by_text("Aprovado", exact=True).count() >= 1
        and first.get_by_role("form").count() == 0
        and "Não homologado" in first.inner_text(),
    )
    page.screenshot(path=str(SHOTS / "17-etapa-6-decisao.png"), full_page=True)

    page.reload(wait_until="networkidle")
    expect(page.get_by_role("heading", name="Decisão e Memorandos")).to_be_visible()
    check(
        "recarregar preserva caso e etapa",
        "etapa=6" in page.url
        and page.get_by_role("heading", name="Demonstrativos Econômicos").count() == 0,
    )

    opportunity_id = dossier_url.rstrip("/").split("/")[-1]
    page.goto(f"{base}/valuation?oportunidade={opportunity_id}")
    page.wait_for_url(f"**/operacao/{opportunity_id}?etapa=5", timeout=15000)
    expect(page.get_by_role("heading", name="Demonstrativos Econômicos")).to_be_visible()
    check("URL antiga com oportunidade leva a etapa correspondente do dossie", True)

    nav = page.get_by_role("navigation", name="Etapas da avaliação")
    nav.get_by_role("button", name="Visão Completa").click()
    expect(page.get_by_role("region", name="Documentos do dossiê e suas versões")).to_be_visible()
    check("visao completa volta a mostrar todas as etapas", "etapa=" not in page.url, page.url)


def table_extras(page: Page, check: Check, dossier_url: str, run: str) -> None:
    """Tabela comum: lacunas, cenarios de calculo, arrasto de colunas, lote e bordas (T015)."""
    page.goto(dossier_url, wait_until="networkidle")
    gaps_table = "Lacunas documentais do dossiê"
    section = page.locator("section").filter(
        has=page.get_by_role("heading", name="Lacunas Documentais")
    )
    region = section.get_by_role("region", name=gaps_table)
    expect(region).to_be_visible()
    sticky = region.evaluate("el => getComputedStyle(el.querySelector('thead th')).position")
    check("lacunas usam a tabela comum, com cabecalho fixo", sticky == "sticky", sticky)

    first_action = region.get_by_role("button").filter(has_text="Marcar como Recebida").first
    first_action.click()
    expect(region.get_by_role("button").filter(has_text="Reabrir Lacuna").first).to_be_visible()
    settled(page)
    check(
        "acao de linha muda a situacao da lacuna na propria tabela",
        "Recebida" in column_cells(page, "Situação", gaps_table),
    )
    region.get_by_role("button").filter(has_text="Reabrir Lacuna").first.click()
    expect(region.get_by_role("button").filter(has_text="Reabrir Lacuna")).to_have_count(0)

    # Reordenar colunas por arrasto no painel de colunas.
    section.get_by_role("button", name="Colunas").click()
    panel = page.get_by_role("dialog", name="Colunas da tabela")
    expect(panel).to_be_visible()
    panel.locator('li[data-column="reason"] [draggable="true"]').drag_to(
        panel.locator('li[data-column="status"]')
    )
    order = panel.locator("li[data-column]").evaluate_all(
        "items => items.map((li) => li.dataset.column)"
    )
    page.keyboard.press("Escape")
    expect(panel).to_be_hidden()
    heads = region.locator("thead th").all_inner_texts()
    labels = [h.strip().upper() for h in heads if h.strip()]

    def position(title: str) -> int:
        # O cabecalho pode trazer o botao de ajuda junto do titulo.
        return next(i for i, label in enumerate(labels) if label.startswith(title))

    check(
        "arrastar no painel de colunas reordena a tabela",
        order[:3] == ["description", "reason", "status"]
        and position("MOTIVO") < position("SITUAÇÃO"),
        f"{order} {labels}",
    )
    check("ordem das colunas fica na URL do dossie", "lac=" in page.url, page.url)

    # Painel perto das bordas superior e esquerda: abre para cima e continua inteiro.
    page.set_viewport_size({"width": 1440, "height": 460})
    trigger = region.get_by_role("button", name="Filtrar Lacuna", exact=True)
    trigger.evaluate(
        "el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY"
        " - (window.innerHeight - 48))"
    )
    anchor = trigger.bounding_box()
    trigger.click()
    edge = page.get_by_role("dialog", name="Filtro de Lacuna")
    expect(edge).to_be_visible()
    box = edge.bounding_box()
    check(
        "filtro da primeira coluna junto ao fim da janela abre para cima, inteiro na janela",
        inside_viewport(box, 1440, 460) and box["y"] + box["height"] <= anchor["y"] + 2,
        f"painel={box} botao={anchor}",
    )
    page.keyboard.press("Escape")
    expect(edge).to_be_hidden()
    page.set_viewport_size({"width": 1440, "height": 900})

    # Acao em massa: encaminhar afirmacoes pendentes para revisao.
    texts = [f"Lote {run} primeira alegação.", f"Lote {run} segunda alegação."]
    for claim_text in texts:
        page.get_by_label("Texto da afirmação").fill(claim_text)
        page.get_by_role("button", name="Registrar Afirmação").click()
        expect(page.get_by_label("Texto da afirmação")).to_have_value("")
    filter_contains(page, "Afirmação", f"Lote {run}")
    claims_table = "Afirmações do dossiê"
    claims = page.get_by_role("region", name=claims_table)
    for claim_text in texts:
        claims.get_by_role("checkbox", name=f"Selecionar {claim_text}").check()
    bulk = page.get_by_role("button", name="Enviar Selecionadas para Revisão")
    expect(bulk).to_be_visible()
    bulk.click()
    expect(page.get_by_text("2 encaminhadas para revisão.")).to_be_visible()
    settled(page)
    states = column_cells(page, "Revisão", claims_table)
    check(
        "acao em massa encaminha as selecionadas para revisao",
        states == ["Em revisão", "Em revisão"],
        str(states),
    )
    bulk.click()
    expect(page.get_by_text("0 encaminhadas para revisão. 2 ignoradas")).to_be_visible()
    check("repetir a acao em massa nao altera de novo e diz por que ignorou", True)
    page.get_by_role("button", name="Limpar seleção", exact=True).click()
    expect(bulk).to_have_count(0)

    # Cenarios de calculo na tabela comum, com dinheiro formatado e memoria por linha.
    calc_table = "Cenários calculados"
    calc = page.get_by_role("region", name=calc_table)
    calc.scroll_into_view_if_needed()
    filter_contains(page, "Cenário", f"Procedência {run}")
    values = column_cells(page, "Resultado Líquido", calc_table)
    check(
        "cenarios calculados na tabela comum, com o mesmo valor do demonstrativo",
        len(values) == 1 and "900.000,00" in values[0] and values[0].startswith("R$"),
        str(values),
    )
    calc.get_by_role("button", name=f"Abrir memória do cenário Procedência {run}").click()
    dialog = page.get_by_role("dialog", name=f"Procedência {run}")
    expect(dialog).to_be_visible()
    check("da tabela de cenarios abre-se a memoria de calculo", "detalhe=calculo" in page.url)
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()
    check("voltar preserva o filtro da tabela de cenarios", "calc=" in page.url, page.url)


def finding_links(page: Page, check: Check, dossier_url: str) -> None:
    """Vinculo declarado entre achado de motor e afirmacao do dossie (T016)."""
    page.goto(dossier_url, wait_until="networkidle")
    page.get_by_role("button", name="Achados em Tabela").click()
    table = page.get_by_role("dialog", name="Achados do Motor")
    expect(table).to_be_visible()
    table.get_by_role("button", name="Abrir Execução").first.click()
    dialog = page.get_by_role("dialog", name="Achados da Execução")
    expect(dialog).to_be_visible()
    # Cada achado e um cartao; o primeiro basta para conferir o vinculo.
    card = dialog.locator("ol > li").filter(has_text="Afirmações relacionadas").first
    expect(card).to_be_visible()
    form = card.get_by_role("form", name="Relacionar afirmação ao achado")
    state_before = card.get_by_text("Revisão:").first.inner_text()
    form.get_by_label("Afirmação do dossiê").select_option(index=1)
    form.get_by_label("Relação").select_option(label="Contraria o achado")
    form.get_by_label("Observação").fill("Conferir na contestação.")
    form.get_by_role("button", name="Relacionar Afirmação").click()
    links = card.get_by_role("list", name="Afirmações relacionadas ao achado")
    expect(links).to_be_visible()
    linked = links.inner_text()
    check(
        "afirmacao relacionada ao achado mostra a relacao e o estado da afirmacao",
        "Contraria o achado" in linked
        and "Afirmação:" in linked
        and "Conferir na contestação." in linked,
        linked[:200],
    )
    check(
        "relacionar afirmacao nao muda o estado de revisao do achado",
        card.get_by_text("Revisão:").first.inner_text() == state_before,
        state_before,
    )
    links.get_by_role("button").filter(has_text="Remover Vínculo").first.click()
    expect(links).to_have_count(0)
    check("vinculo pode ser removido e a ficha volta a declarar que nao ha afirmacao", True)
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()


def origin_reports(page: Page, check: Check, dossier_url: str) -> None:
    """Relatorios derivados da originacao entram como documentos, sem liberar os autos (T005)."""
    page.goto(dossier_url, wait_until="networkidle")
    page.get_by_role("button", name="Importar Relatórios da Originação").click()
    result = page.get_by_role("list", name="Resultado da importação de relatórios")
    expect(result).to_be_visible()
    first = result.inner_text()
    check(
        "relatorios da originacao sao importados e cada um diz o que aconteceu",
        "Dossiê da originação (relatório derivado)" in first
        and ("recebido" in first or "já estava no dossiê" in first),
        first,
    )
    page.get_by_role("button", name="Importar Relatórios da Originação").click()
    expect(result.get_by_text("já estava no dossiê").first).to_be_visible()
    check(
        "repetir a importacao nao cria fonte nova",
        "recebido" not in result.inner_text(),
        result.inner_text(),
    )
    filter_contains(page, "Documento", "relatório derivado")
    categories = set(column_cells(page, "Categoria", "Documentos do dossiê e suas versões"))
    check(
        "relatorio importado aparece como relatorio derivado, nao como autos",
        categories == {"Relatório derivado"},
        str(categories),
    )
    check(
        "relatorio derivado nao libera o parecer integral",
        page.get_by_role("heading", name="Parecer integral indisponível").count() == 1,
    )


def diligence_sheet(run: str) -> bytes:
    """Planilha SINTETICA no formato de resultado de consulta em fonte real."""
    import io

    from openpyxl import Workbook

    wb = Workbook()
    wb.active.append(
        [
            "Processo (CNJ)",
            "Tribunal",
            "Papel",
            "Lado",
            "Data do ato",
            "Ato",
            "Data de distribuição",
            "Referência na fonte",
        ]
    )
    wb.active.append(
        [
            "9000077-77.2023.8.26.0100",
            "TJSP",
            "Perito",
            "Juízo",
            "2024-03-10",
            f"Nomeação sintética {run}",
            "2023-02-01",
            f"https://fonte.invalid/consulta/{run}",
        ]
    )
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def external_engines(
    page: Page, check: Check, dossier_url: str, run: str, tmp: str, console_errors: list[str]
) -> None:
    """Pedido do P4, mapa de evidencias, relatorio do motor e fonte real por planilha."""
    page.goto(dossier_url, wait_until="networkidle")

    # P4: a Evidia prepara o texto de entrada; a execucao e externa.
    form = page.get_by_role("form", name="Preparar execução do P4")
    form.get_by_role("button", name="Preparar Execução").click()
    expect(form.get_by_text("nada é presumido")).to_be_visible()
    check("pedido do P4 sem documento ou lado e recusado na tela", True)
    form.get_by_label("Documento a analisar no P4").select_option(label=f"Peça texto {run} · v1")
    form.get_by_label("Lado da execução").select_option(label="Réu")
    form.get_by_label("Orientação para quem executa").fill(f"Pedido sintético {run}")
    form.get_by_role("button", name="Preparar Execução").click()
    card = page.get_by_role("listitem").filter(has_text=f"Pedido sintético {run}").first
    expect(card.get_by_text("Aguardando execução externa")).to_be_visible()
    with page.expect_download() as download:
        card.get_by_role("button", name="Baixar Texto de Entrada").click()
    package = Path(tmp) / "p4-entrada.txt"
    download.value.save_as(package)
    body = package.read_text(encoding="utf-8")
    check(
        "pedido do P4 gera o texto de entrada paginado no formato que o P4 le",
        body.startswith("<pagina> 1\n") and len(body) > 20,
        body[:60],
    )
    card.get_by_label("Relatório gerado para este pedido (.xlsx)").select_option(
        label=f"Relatório P4 {run} · v1 · relatorio-p4-{run}.xlsx"
    )
    card.get_by_role("button", name="Importar e Fechar Pedido").click()
    expect(card.get_by_text("Relatório importado", exact=True)).to_be_visible()
    check(
        "importar o relatorio fecha o pedido de execucao",
        card.get_by_role("button", name="Baixar Texto de Entrada").count() == 0,
    )
    page.screenshot(path=str(SHOTS / "18-pedido-p4.png"), full_page=True)

    # Nulidade360: a planilha do dossie pode ser entregue como mapa de evidencias.
    start = page.get_by_role("form", name="Iniciar auditoria simulada")
    options = (
        start.get_by_label("Mapa de evidências (opcional)").locator("option").all_inner_texts()
    )
    check(
        "auditoria oferece as planilhas do dossie como mapa de evidencias opcional",
        options[0] == "Sem mapa de evidências"
        and any(f"relatorio-p4-{run}.xlsx" in o for o in options),
        str(options[:3]),
    )
    report = page.get_by_role("button", name="Baixar Relatório do Motor").first
    report.scroll_into_view_if_needed()
    downloaded = False
    errors_before = len(console_errors)
    try:
        with page.expect_download(timeout=6000):
            report.click()
        downloaded = True
    except Exception:  # sem download: o motor deve ter explicado por que nao ha relatorio
        pass
    run_card = page.locator("article").filter(has=report).first
    if not downloaded:
        expect(run_card.get_by_text("não tem relatório")).to_be_visible()
        # O 409 do motor sem relatorio e resposta esperada, nao erro de aplicacao.
        del console_errors[errors_before:]
    check(
        "relatorio do motor e baixado ou a tela explica por que o motor nao o gerou",
        downloaded or run_card.get_by_text("não tem relatório").count() == 1,
    )

    # Diligencia: resultado de consulta em fonte real, trazido por planilha do dossie.
    sheet = Path(tmp) / f"consulta-{run}.xlsx"
    sheet.write_bytes(diligence_sheet(run))
    title = f"Consulta em fonte {run}"
    page.get_by_label("Arquivo", exact=True).set_input_files(str(sheet))
    page.get_by_label("Título").fill(title)
    page.get_by_role("button", name="Enviar Documento").click()
    expect(page.get_by_text("Versão 1 recebida.")).to_be_visible()
    page.get_by_role("button", name="Abrir Diligência").click()
    dialog = page.get_by_role("dialog", name="Vínculos e Qualificação")
    expect(dialog).to_be_visible()
    source = dialog.get_by_role("form", name="Registrar consulta feita em fonte real")
    source.get_by_role("button", name="Registrar Consulta").click()
    expect(source.get_by_text("Sem a cobertura")).to_be_visible()
    check("consulta em fonte real sem cobertura declarada e recusada na tela", True)
    source.get_by_label("Profissional consultado").select_option(index=1)
    source.get_by_label("Planilha do resultado (.xlsx)").select_option(
        label=f"{title} · v1 · consulta-{run}.xlsx"
    )
    source.get_by_label("Fonte consultada").fill("Portal sintético do tribunal")
    source.get_by_label("O que a consulta cobre e o que não cobre").fill(
        "Busca por nome no portal; não inclui processos em segredo de justiça."
    )
    source.get_by_role("button", name="Registrar Consulta").click()
    expect(source.get_by_text("1 atuação(ões) lida(s) da planilha.")).to_be_visible()
    check("resultado de fonte real entra por planilha, com fonte e cobertura declaradas", True)
    dialog.get_by_role("button", name="Voltar").click()
    expect(dialog).to_be_hidden()


def contextual_help(page: Page, check: Check, dossier_url: str) -> None:
    """Ajuda de secao, de coluna e de botao: tres partes, em portal, dentro da janela."""
    page.goto(dossier_url, wait_until="networkidle")
    # A barra de etapas so aparece depois de a pagina carregar no cliente: sem isso o mouse
    # chega antes de a ajuda estar pronta para responder.
    nav = page.get_by_role("navigation", name="Etapas da avaliação")
    expect(nav.get_by_role("listitem").get_by_role("button")).to_have_count(7)
    settled(page)

    def open_help(name: str) -> tuple[str, dict, str, bool]:
        hint = page.get_by_role("button", name=f"Ajuda sobre {name}", exact=True).first
        hint.scroll_into_view_if_needed()
        hint.hover()
        tip = page.get_by_role("tooltip")
        expect(tip).to_be_visible()
        out = (
            tip.inner_text(),
            tip.bounding_box(),
            tip.evaluate("el => getComputedStyle(el).zIndex"),
            tip.evaluate("el => el.parentElement === document.body"),
        )
        page.mouse.move(0, 0)
        expect(tip).to_have_count(0)
        return out

    def three_parts(body: str, heads: tuple[str, str, str]) -> bool:
        lines = [line for line in body.splitlines() if line.strip()]
        return len(lines) == 3 and all(
            line.startswith(head) for line, head in zip(lines, heads, strict=True)
        )

    samples = [
        ("os documentos do dossiê", ("O que é:", "Como funciona:", "Como ler:")),
        ("as etapas da avaliação", ("O que é:", "Como funciona:", "Como ler:")),
        ("o painel de vínculos", ("O que faz:", "Quando usar:", "O que muda:")),
        ("Natureza", ("O que é:", "Como é calculado:", "Como ler:")),
        ("Hash (SHA-256)", ("O que é:", "Como é calculado:", "Como ler:")),
    ]
    results = {name: (open_help(name), heads) for name, heads in samples}
    check(
        "ajuda de secao, etapa, botao e coluna vem em tres partes, uma por linha",
        all(three_parts(out[0], heads) for out, heads in results.values()),
        str({name: out[0][:60] for name, (out, _) in results.items()}),
    )
    check(
        "baloes de ajuda em portal no body, z-index 9999 e inteiros na janela",
        all(
            out[3] and out[2] == "9999" and inside_viewport(out[1], 1440, 900)
            for out, _ in results.values()
        ),
        str({name: (out[2], out[3], out[1]) for name, (out, _) in results.items()}),
    )
    hints = page.get_by_role("button", name=re.compile("^Ajuda sobre ")).count()
    check("dossie oferece ajuda em secoes, colunas e acoes", hints >= 60, str(hints))

    # Teclado: o foco abre a ajuda e Esc fecha.
    hint = page.get_by_role("button", name="Ajuda sobre as afirmações do dossiê", exact=True)
    hint.focus()
    expect(page.get_by_role("tooltip")).to_be_visible()
    page.keyboard.press("Escape")
    expect(page.get_by_role("tooltip")).to_have_count(0)
    check("ajuda abre pelo teclado e fecha com Esc", True)

    # Largura de celular: o balao cabe na tela.
    page.set_viewport_size({"width": 375, "height": 812})
    hint = page.get_by_role("button", name="Ajuda sobre os documentos do dossiê", exact=True)
    hint.scroll_into_view_if_needed()
    # Foco, e nao clique de mouse: o mouse passa por cima antes de clicar e fecharia o balao.
    hint.focus()
    tip = page.get_by_role("tooltip")
    expect(tip).to_be_visible()
    check(
        "em largura de celular o balao de ajuda cabe na janela",
        inside_viewport(tip.bounding_box(), 375, 812),
        str(tip.bounding_box()),
    )
    page.screenshot(path=str(SHOTS / "19-ajuda-contextual-375.png"))
    page.keyboard.press("Escape")
    page.set_viewport_size({"width": 1440, "height": 900})
    hint = page.get_by_role("button", name="Ajuda sobre a auditoria de nulidades", exact=True)
    hint.scroll_into_view_if_needed()
    hint.hover()
    expect(page.get_by_role("tooltip")).to_be_visible()
    page.screenshot(path=str(SHOTS / "19-ajuda-contextual.png"))
    page.mouse.move(0, 0)


def main() -> int:
    # Console do Windows (cp1252) nao imprime todos os caracteres da tela; nao falhar por isso.
    sys.stdout.reconfigure(errors="replace")
    parser = argparse.ArgumentParser()
    parser.add_argument("--frontend", default="http://localhost:5180")
    args = parser.parse_args()
    settings = get_settings()
    base = args.frontend
    check = Check()
    run = uuid.uuid4().hex[:6]
    SHOTS.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
        pdf_path = Path(tmp) / f"peca-sintetica-{run}.pdf"
        pdf_path.write_bytes(make_pdf(3, f"peca sintetica {run}"))

        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="pt-BR")
        page = context.new_page()
        console_errors: list[str] = []
        page.on(
            "console",
            lambda m: console_errors.append(m.text) if m.type == "error" else None,
        )
        page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))

        # Sem sessao, a area operacional leva ao login (nao mostra dados).
        page.goto(f"{base}/operacao", wait_until="networkidle")
        page.wait_for_url("**/operacao/login", timeout=15000)
        check("sem sessao, /operacao redireciona ao login", True)
        # Os 401 esperados da checagem de sessao nao contam como erro de aplicacao.
        console_errors.clear()

        page.get_by_label("Usuário").fill(settings.admin_username)
        page.get_by_label("Senha").fill("senha-errada")
        page.get_by_role("button", name="Entrar na Operação").click()
        expect(page.get_by_text("Usuário ou senha inválidos")).to_be_visible()
        check("credencial errada mostra erro ao lado do formulario", True)
        console_errors.clear()

        page.get_by_label("Senha").fill(settings.admin_password)
        page.keyboard.press("Enter")
        page.wait_for_url(f"{base}/operacao", timeout=15000)
        expect(page.get_by_role("heading", name="Oportunidades em Avaliação")).to_be_visible()
        check("login por teclado abre a lista de oportunidades", True)
        expect(page.get_by_text("Ambiente: operação local")).to_be_visible()
        check("rodape identifica ambiente operacional (nao demonstracao)", True)
        check(
            "envio simulado da demonstracao nao aparece na operacao",
            page.get_by_role("button", name="Upload do processo").count() == 0,
        )
        page.screenshot(path=str(SHOTS / "01-oportunidades.png"), full_page=True)

        page.get_by_role("link", name="Nova Entrada").first.click()
        expect(page.get_by_role("heading", name="Selecionar na Originação")).to_be_visible()
        expect(page.get_by_text("Dado sintético").first).to_be_visible()
        check("entrada lista candidatos marcados como sinteticos", True)

        row = page.get_by_role("row").filter(has_text="Autora Sintética Alfa")
        row.get_by_role("button").click()
        form = page.get_by_role("form", name="Confirmar importação")
        form.get_by_role("button", name="Importar Oportunidade").click()
        expect(form.get_by_text("Escolha a posição avaliada")).to_be_visible()
        expect(form.get_by_text("Informe a parte representada")).to_be_visible()
        check("importar sem posicao/parte mostra erros nos campos (sem valor presumido)", True)

        form.get_by_text("Autor", exact=True).click()
        form.get_by_role("button", name="Usar nome informado pela origem").click()
        page.screenshot(path=str(SHOTS / "02-entrada-confirmacao.png"), full_page=True)
        form.get_by_role("button", name="Importar Oportunidade").click()
        page.wait_for_url("**/operacao/*-*", timeout=15000)
        expect(page.get_by_role("heading", name="Parecer integral indisponível")).to_be_visible()
        expect(page.get_by_text("Contrato: não definido")).to_be_visible()
        expect(page.get_by_text("Autos integrais nao fornecidos pela origem")).to_be_visible()
        check("dossie mostra bloqueio de parecer, lacuna de autos e contrato nao definido", True)

        page.get_by_label("Arquivo", exact=True).set_input_files(str(pdf_path))
        page.get_by_label("Título").fill(f"Peça sintética {run}")
        page.get_by_role("button", name="Enviar Documento").click()
        expect(page.get_by_text("Versão 1 recebida.")).to_be_visible()
        filter_contains(page, "Documento", run)
        doc_row = page.get_by_role("row").filter(has_text=f"Peça sintética {run}")
        expect(doc_row).to_be_visible()
        expect(doc_row.get_by_text("Processado")).to_be_visible()
        check("documento enviado aparece com versao, paginas e estado", "3" in doc_row.inner_text())

        page.get_by_label("Texto da afirmação").fill(f"A autora alegou atraso ({run}).")
        page.get_by_label("Documento de origem", exact=True).select_option(
            label=f"Peça sintética {run} · v1 · 3 p."
        )
        page.get_by_label("Página do arquivo").fill("2")
        page.get_by_role("button", name="Registrar Afirmação").click()
        expect(page.get_by_label("Texto da afirmação")).to_have_value("")
        filter_contains(page, "Afirmação", run)
        claim_row = page.get_by_role("row").filter(has_text=f"A autora alegou atraso ({run}).")
        expect(claim_row).to_be_visible()
        check(
            "afirmacao registrada com documento e pagina de origem",
            f"Peça sintética {run}" in claim_row.inner_text(),
        )

        url_before = page.url
        # Endereco do dossie sem as consultas das tabelas, para as etapas seguintes.
        dossier_url = page.url.split("?")[0]
        claim_row.get_by_role("button", name="Abrir Ficha").click()
        dialog = page.get_by_role("dialog", name="Ficha da Afirmação")
        expect(dialog).to_be_visible()
        # Posicao da pagina no momento em que o detalhe abriu (o clique pode rolar antes).
        scroll_before = page.evaluate("window.scrollY")
        box = dialog.bounding_box()
        check(
            "ficha abre em tela inteira (100vw x 100vh)",
            box is not None
            and box["x"] == 0
            and box["y"] == 0
            and round(box["width"]) == 1440
            and round(box["height"]) == 900,
            str(box),
        )
        back = dialog.get_by_role("button", name="Voltar")
        expect(back).to_be_visible()
        check(
            "botao Voltar no topo recebe o foco",
            back.evaluate("el => el === document.activeElement"),
        )
        check("detalhe aberto fica na URL", "detalhe=afirmacao" in page.url)

        dialog.get_by_label("Estado da revisão").select_option("validated")
        dialog.get_by_label("Fundamento da revisão").fill("Conferido na página 2.")
        dialog.get_by_role("button", name="Registrar Revisão").click()
        expect(dialog.get_by_text("Revisão registrada.", exact=True)).to_be_visible()
        expect(dialog.get_by_text("Pendente → Validada")).to_be_visible()
        check("revisao registrada com historico antes -> depois", True)
        page.screenshot(path=str(SHOTS / "03-ficha-tela-inteira.png"))

        page.keyboard.press("Escape")
        expect(dialog).to_be_hidden()
        check(
            "Esc/Voltar fecha a ficha e remove o detalhe da URL", page.url == url_before, page.url
        )
        scroll_after = page.evaluate("window.scrollY")
        check(
            "voltar preserva a posicao de rolagem",
            abs(scroll_after - scroll_before) <= 2,
            f"{scroll_before} -> {scroll_after}",
        )

        # Ajuda de coluna: em portal, acima de tudo e dentro da janela.
        hint = page.get_by_role("button", name="Ajuda sobre Natureza")
        hint.scroll_into_view_if_needed()
        hint.hover()
        tip = page.get_by_role("tooltip")
        expect(tip).to_be_visible()
        tbox = tip.bounding_box()
        z = tip.evaluate("el => getComputedStyle(el).zIndex")
        parent = tip.evaluate("el => el.parentElement === document.body")
        check(
            "ajuda de coluna em portal no body, z-index 9999, dentro da janela",
            parent
            and z == "9999"
            and tbox["x"] >= 0
            and tbox["x"] + tbox["width"] <= 1440
            and tbox["y"] >= 0,
            f"z={z} parent_body={parent} box={tbox}",
        )
        page.mouse.move(0, 0)

        # Tabela larga: cabecalho fixo e rolagem horizontal alcancavel dentro da janela.
        region = page.get_by_role("region", name="Documentos do dossiê e suas versões")
        metrics = region.evaluate(
            """el => ({
                maxHeight: getComputedStyle(el).maxHeight,
                overflowX: getComputedStyle(el).overflowX,
                sticky: getComputedStyle(el.querySelector('thead th')).position,
                viewport: window.innerHeight,
            })"""
        )
        check(
            "tabela: altura limitada a janela, cabecalho sticky e overflow horizontal proprio",
            metrics["sticky"] == "sticky"
            and metrics["overflowX"] == "auto"
            and metrics["maxHeight"] == f"{metrics['viewport'] - 240}px",
            str(metrics),
        )

        page.screenshot(path=str(SHOTS / "04-dossie.png"), full_page=True)

        economics(page, check, run, tmp)
        common_table(page, check, base, run, tmp)
        dossier_tables(page, check, dossier_url, run, tmp)
        engine_audit(page, check, dossier_url, run, tmp, console_errors)
        document_text(page, check, dossier_url, run, tmp, console_errors)
        diligence(page, check, dossier_url, run, tmp, console_errors)
        contradictory(page, check, dossier_url, run, console_errors)
        p4_and_findings(page, check, dossier_url, run, tmp)
        economics_impacts(page, check, dossier_url, run, tmp)
        stages_and_decision(page, check, base, dossier_url, run)
        table_extras(page, check, dossier_url, run)
        finding_links(page, check, dossier_url)
        external_engines(page, check, dossier_url, run, tmp, console_errors)
        origin_reports(page, check, dossier_url)
        contextual_help(page, check, dossier_url)
        check("sem erros de console na jornada", not console_errors, "; ".join(console_errors[:3]))

        # Volta ao dossie para a checagem de largura de celular.
        page.goto(dossier_url, wait_until="networkidle")

        # Largura de celular: sem rolagem horizontal da pagina.
        page.set_viewport_size({"width": 375, "height": 812})
        page.wait_for_timeout(300)
        check("375px: dossie sem rolagem horizontal da pagina", no_horizontal_scroll(page))
        page.screenshot(path=str(SHOTS / "05-dossie-375.png"), full_page=True)
        page.goto(f"{base}/operacao", wait_until="networkidle")
        check("375px: lista sem rolagem horizontal da pagina", no_horizontal_scroll(page))

        # A demonstracao continua separada e identificada.
        page.set_viewport_size({"width": 1440, "height": 900})
        page.goto(f"{base}/dashboard", wait_until="networkidle")
        expect(page.get_by_text("Ambiente: demonstração")).to_be_visible()
        check(
            "demo preservada, rotulada e com seu envio simulado",
            page.get_by_role("button", name="Upload do processo").count() == 1,
        )

        page.goto(f"{base}/operacao", wait_until="networkidle")
        page.get_by_role("button", name="Sair").click()
        page.wait_for_url("**/operacao/login", timeout=15000)
        page.goto(f"{base}/operacao", wait_until="networkidle")
        page.wait_for_url("**/operacao/login", timeout=15000)
        check("apos sair, a area operacional volta a exigir login", True)

        browser.close()

    print(f"\n{'APROVADO' if check.failures == 0 else 'REPROVADO'} — falhas: {check.failures}")
    return 0 if check.failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
