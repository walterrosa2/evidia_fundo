"""Passagem de navegador do analista nas telas que dependem de IA REAL (amostra).

CONSOME API PAGA: faz UMA chamada ao modelo (sugestao de afirmacoes de uma peca). A auditoria
do Nulidade360 nao e disparada aqui — a tela e conferida sobre uma execucao real ja feita por
`analyst_eval.py`.

Uso (em backend/, com os servicos no ar em modo real):

    python scripts/ui_analyst_real.py --opportunity <id do dossie avaliado>
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from evidia.config import get_settings

sys.path.insert(0, ".")
from scripts.smoke_e2e import Check  # noqa: E402

SHOTS = Path(__file__).resolve().parents[2] / "artifacts" / "qa" / "ui-real"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--opportunity", required=True)
    parser.add_argument("--frontend", default="http://localhost:5180")
    args = parser.parse_args()
    sys.stdout.reconfigure(errors="replace")
    settings = get_settings()
    check = Check()
    SHOTS.mkdir(parents=True, exist_ok=True)
    dossier = f"{args.frontend}/operacao/{args.opportunity}"

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_context(
            viewport={"width": 1440, "height": 900}, locale="pt-BR"
        ).new_page()
        page.set_default_timeout(120_000)
        errors: list[str] = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

        page.goto(f"{args.frontend}/operacao/login", wait_until="networkidle")
        page.get_by_label("Usuário").fill(settings.admin_username)
        page.get_by_label("Senha").fill(settings.admin_password)
        page.keyboard.press("Enter")
        page.wait_for_url(f"{args.frontend}/operacao", timeout=20000)
        errors.clear()  # os 401 da checagem de sessao antes do login sao esperados

        # ---- etapa 2: o analista pede sugestoes ao modelo para a contestacao
        page.goto(f"{dossier}?etapa=2", wait_until="networkidle")
        row = page.get_by_role("row").filter(has_text="Contestação (sintética)").first
        row.get_by_role("button", name="Texto e estrutura").click()
        dialog = page.get_by_role("dialog", name="Texto e Estrutura do Documento")
        expect(dialog).to_be_visible()
        dialog.get_by_role("button", name="Sugerir com Modelo").click()
        first = dialog.get_by_role("button", name="Registrar como Afirmação").first
        # O modelo real leva dezenas de segundos: a espera padrao de 5 s nao serve aqui.
        expect(first).to_be_visible(timeout=180_000)
        text = dialog.inner_text()
        check(
            "sugestoes vieram do modelo real, identificado, sem aviso de modo simulado",
            "modelo gemini" in text and "Modelo em modo simulado" not in text,
        )
        check(
            "em peca de parte a tela avisa que constatacao do modelo entra como alegacao",
            "peça de parte" in text or "Constatação documental" not in text,
        )
        page.screenshot(path=str(SHOTS / "01-sugestoes-do-modelo.png"))
        first.click()
        expect(dialog.get_by_role("button", name="Registrada como Pendente").first).to_be_visible()
        check("aceitar a sugestao e ato do analista e a afirmacao nasce pendente", True)
        dialog.get_by_role("button", name="Voltar").click()
        expect(dialog).to_be_hidden()

        # ---- etapa 3: auditoria real do motor, sem rotulo de teste
        page.goto(f"{dossier}?etapa=3", wait_until="networkidle")
        section = page.locator("section").filter(
            has=page.get_by_role("heading", name="Auditoria de Nulidades")
        )
        if section.count() == 0:
            section = page.locator("section").filter(has_text="Modo real.").first
        body = page.locator("main").inner_text()
        check(
            "a tela declara modo real e que a auditoria consome API paga",
            "Modo real." in body
            and page.get_by_role("button", name="Iniciar Auditoria (Consome API Paga)").count() == 1
            and "Somente modo simulado" not in body,
        )
        run_card = page.locator("article").filter(has_text="gemini").first
        expect(run_card).to_be_visible()
        card = run_card.inner_text()
        check(
            "execucao real aparece sem a marca de modo simulado, com modelo e custo nao informado",
            "Modo simulado" not in card and "Não informado pelo motor" in card,
            card[:200],
        )
        run_card.get_by_role("button", name=re.compile(r"^Ver \d+ Achados?$")).click()
        findings = page.get_by_role("dialog", name="Achados da Execução")
        expect(findings).to_be_visible()
        # Espera os achados carregarem antes de ler a tela.
        expect(findings.get_by_text("Revisão: Pendente").first).to_be_visible(timeout=60_000)
        ftext = findings.inner_text()
        check(
            "achados reais abrem em tela inteira, sem aviso de teste, todos pendentes de revisao",
            "Modo simulado." not in ftext and "Revisão: Pendente" in ftext,
        )
        check(
            "achado sem lastro conferivel mostra a pendencia de evidencia",
            "pendente de evidência" in ftext or "Pendência" in ftext or "evidência" in ftext,
        )
        page.screenshot(path=str(SHOTS / "02-achados-reais.png"))
        findings.get_by_role("button", name="Voltar").click()
        expect(findings).to_be_hidden()

        # ---- etapa 4: cenarios gerados por modelo, rotulados
        page.goto(f"{dossier}?etapa=4", wait_until="networkidle")
        page.get_by_role("button", name="Abrir Contraditório").click()
        contradictory = page.get_by_role("dialog").first
        expect(contradictory).to_be_visible()
        expect(contradictory.get_by_text("gerado por modelo").first).to_be_visible(timeout=60_000)
        ctext = contradictory.inner_text()
        check(
            "cenarios dos dois lados aparecem rotulados como gerados por modelo",
            ctext.count("gerado por modelo") >= 2,
        )
        page.screenshot(path=str(SHOTS / "03-contraditorio-por-modelo.png"))
        contradictory.get_by_role("button", name="Voltar").click()

        # ---- etapa 6: memorando segue rotulado como nao homologado
        page.goto(f"{dossier}?etapa=6", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Decisão e Memorandos")).to_be_visible()
        memos = page.get_by_role("list", name="Memorandos Emitidos")
        check(
            "memorando do caso avaliado com IA real continua rotulado como nao homologado",
            memos.count() == 1 and "Não homologado" in memos.inner_text(),
        )
        page.screenshot(path=str(SHOTS / "04-decisao.png"), full_page=True)

        check("sem erros de console na passagem", not errors, "; ".join(errors[:3]))
        browser.close()

    print(f"\n{'APROVADO' if check.failures == 0 else 'REPROVADO'} — falhas: {check.failures}")
    return 0 if check.failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
