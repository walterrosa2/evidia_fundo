# Relatório de QA — incremento 6 (revisão de achados do motor)

Data: 2026-11-17 · Branch: `ia-feature/evidia-operacional` (base `main` `5f3a45d`) · Sem commit.
Ambiente e versões: os mesmos do incremento 1 (`2026-11-16_incremento-1.md`).

O motor rodou apenas em modo de teste (`MOCK_AI`), em pasta isolada, com texto sintético.
Nenhuma API paga foi consumida. Este relatório não é homologação jurídica, econômica nem da
integração em execução real.

## Resultados

| # | Comando (diretório) | Resultado |
|---|---|---|
| 1 | `python -m pytest` (`backend/`) | **138 passed** (135 anteriores + 3 novos) |
| 2 | `python -m pytest --cov=evidia` (`backend/`) | cobertura total **95%** |
| 3 | `python -m ruff check .` e `ruff format --check .` (`backend/`) | sem pendências |
| 4 | `alembic upgrade head` no banco local | `0004 (head)` aplicada |
| 5 | `npm test` (raiz) | **41 passed** em 5 arquivos (39 anteriores + 2 novos) |
| 6 | `npx tsc --noEmit` e `npm run build` (raiz) | exit 0 |
| 7 | `npm run lint` (raiz) | exit 1 — **mesma falha preexistente** em `vite.config.ts:16` |
| 8 | `python scripts/smoke_e2e.py` (`backend/`) | **APROVADO** |
| 9 | `python scripts/nulidade360_check.py` (`backend/`, Nulidade360 em `MOCK_AI`) | **APROVADO**, 13 checagens |
| 10 | `python scripts/ui_journey.py` (`backend/`, Edge) | **APROVADO**, 67 checagens (64 anteriores + 3 novas), sem erro de console além das duas recusas esperadas |

O motor simulado foi iniciado pelo script do projeto (`start_nulidade360_mock.ps1`), que
funcionou como documentado.

## O que os testes novos cobrem

| Comportamento | Onde | Situação |
|---|---|---|
| Achado de execução simulada pode ser descartado, nunca validado; a recusa lista os impedimentos | `test_engines.py`, `ui_journey.py` | Passa |
| Validar ou descartar exige fundamento escrito | `test_engines.py`, `ui_journey.py` | Passa |
| Revisão é do papel de revisor e respeita a organização | `test_engines.py` | Passa |
| AC05: citação informada pelo revisor (documento vigente do dossiê, página existente) resolve a pendência; página inexistente ou documento de fora são recusados | `test_engines.py` | Passa |
| Achado de execução desatualizada não pode ser validado | `test_engines.py` | Passa |
| Achado com citação válida de execução atual é validado com fundamento; o histórico guarda cada mudança | `test_engines.py` | Passa **com dublê do motor** |
| A saída original do motor não muda com a revisão | `test_engines.py` | Passa |

## Defeitos encontrados e corrigidos

1. Roteiro de interface (não era defeito do produto): as duas recusas esperadas da revisão
   (409 e 422) aparecem no console do navegador e reprovavam a checagem “sem erros de
   console”. O roteiro agora confere que são exatamente essas duas e mantém a checagem para
   qualquer outro erro.

## Limites e pendências

- **Validação real não exercitada na interface:** só existem execuções simuladas, e achado
  simulado não pode ser validado. O caminho foi provado no servidor com substituto do motor.
- **Fora desta entrega:** vínculo de achado com afirmações e valores; achados na tabela
  comum; revisão em lote.
- **Não executado:** análise real (API paga); leitor de tela; navegadores além do Edge.
- **Bloqueado por dependência:** execução real do Nulidade360 e P4; originação real (D3);
  metodologia econômica (D7); política de colunas (D5).

## Artefatos

- Captura regenerada: `artifacts/qa/ui/09-achados-do-motor.png` (dados de teste do motor).
- Contratos regenerados: `openapi.json`, `schemas/finding.json`, `schemas/scenario_run.json`,
  `fixtures/motores_sinteticos.json` (campo `source` na citação).
