# Relatório de QA — incremento 1 (entrada → snapshot → dossiê → revisão)

Data: 2026-11-16 · Branch: `ia-feature/evidia-operacional` (base `main` `5f3a45d`) · Sem commit.
Ambiente: Windows 11, Python 3.13.7, Node 22.19.0, Edge 157 (Playwright 1.65.2).
Versões: FastAPI 0.163.1, SQLAlchemy 2.1.9, Alembic 1.20.1, Pydantic 2.14.3, pypdf 7.1.0,
pytest 9.2.0, ruff 0.17.5, vitest 3.2.7.

Todos os dados usados são **sintéticos** (fixture rotulada). Nenhuma API paga foi consumida;
nenhum módulo externo foi alterado ou executado. Este relatório não é homologação jurídica,
econômica nem de integração real.

## Resultados

| # | Comando (diretório) | Resultado |
|---|---|---|
| 1 | `python -m pytest` (`backend/`) | **82 passed**, 4 avisos de depreciação de bibliotecas |
| 2 | `python -m pytest --cov=evidia` (`backend/`) | cobertura total **95%** |
| 3 | `python -m ruff check .` (`backend/`) | All checks passed |
| 4 | `npm test` (raiz) | **10 passed** (vitest, `src/lib/operacao/api.test.ts`) |
| 5 | `npx tsc --noEmit` (raiz) | exit 0 |
| 6 | `npm run build` (raiz) | exit 0 |
| 7 | `npm run lint` (raiz) | exit 1 — **falha preexistente**, ver abaixo |
| 8 | `python scripts/smoke_e2e.py` (`backend/`, serviços no ar) | **APROVADO**, 31 checagens |
| 9 | `python scripts/ui_journey.py` (`backend/`, Edge) | **APROVADO**, 22 checagens |

### Classificação das ocorrências

- **Falha preexistente (não é regressão):** `npm run lint` já falhava no baseline com 1 erro
  `prettier/prettier` em `vite.config.ts:16` e 6 avisos `react-refresh` em `src/components/ui/*`.
  Depois das mudanças o resultado é idêntico (1 erro, 6 avisos, mesmos arquivos). Não corrigido
  porque o arquivo não faz parte deste escopo.
- **Defeitos encontrados e corrigidos durante o ciclo:**
  1. Toda transação tomava a trava de escrita do SQLite, inclusive leituras (pego pelo teste
     de concorrência). Corrigido: só requisições que alteram estado travam.
  2. Rolagem horizontal da página em 375 px no dossiê (campo oculto em posição absoluta
     escapava da tabela). Corrigido em `TableFrame`.
  3. Voltar do detalhe deslocava a página ao devolver o foco. Corrigido (`preventScroll`).
  4. O inicializador aceitava o healthcheck de um processo antigo na mesma porta. Corrigido:
     recusa iniciar com porta ocupada.
- **Não executado:** leitor de tela; navegadores além do Edge; teste de carga; contêiner Docker.
- **Bloqueado por dependência:** homologação contra a originação real (D3); execução de
  Nulidade360/P4 (custo e autorização); validação da metodologia econômica (D7).

## Aceites cobertos por teste automatizado

| Aceite | Onde | Situação |
|---|---|---|
| AC01 importação simultânea → uma operação, mesmo ID, tentativas registradas | `test_import.py` (8 threads) | Passa |
| AC02 relatório sem autos → derivado, lacuna, parecer integral bloqueado | `test_import.py`, `test_origination_adapter.py` | Passa |
| AC03 acesso revogado/outra organização → negado no servidor | `test_security.py` | Passa |
| AC04 versão nova → dependentes desatualizados, anterior preservado | `test_dossier.py`, smoke | Passa |
| AC05 achado sem citação resolvível → não validado | `test_dossier.py`, smoke | Passa |
| AC13 sem contrato → dois demonstrativos, campos contratuais nulos | `test_economics.py`, `test_security.py` | Passa (motor/API; sem tela) |
| AC14 R$ 1.000.000 / 700.000 / 50.000 → 300.000 e 250.000, sem receita da Evidia | `test_economics.py`, smoke | Passa |
| AC15 custo já incluído não é deduzido de novo | `test_economics.py` | Passa |
| AC16 score heurístico nunca vira probabilidade | `test_economics.py` | Passa |
| AC18 detalhe em tela inteira; voltar restaura URL e rolagem; ajuda sem corte | `ui_journey.py` | Passa (ajuda testada em uma posição, não nas quatro bordas) |
| AC22 segredo/configuração ausente → erro sanitizado, sem cair para demo | `test_import.py`, `test_origination_adapter.py`, `api.test.ts` | Passa |
| Exemplo RF14 → R$ 403.686,20 | `test_economics.py` | Passa |

**Sem cobertura neste incremento:** AC06–AC12, AC17, AC19–AC21 (funcionalidades não construídas).

## Artefatos

- Capturas da interface (dados sintéticos): `artifacts/qa/ui/01-oportunidades.png`,
  `02-entrada-confirmacao.png`, `03-ficha-tela-inteira.png`, `04-dossie.png`, `05-dossie-375.png`.
- Contratos: `specs/001-evidia-operacional/contracts/`.
- Trilha de auditoria local: `backend/logs/audit.jsonl` (não versionada).
