# Relatório de QA — incremento 5 (Nulidade360 em modo simulado)

Data: 2026-11-17 · Branch: `ia-feature/evidia-operacional` (base `main` `5f3a45d`) · Sem commit.
Ambiente e versões: os mesmos do incremento 1 (`2026-11-16_incremento-1.md`).

**O motor rodou apenas em modo de teste (`MOCK_AI`).** Nenhuma API paga foi consumida e
nenhum documento real foi enviado: só arquivos de texto sintéticos. Os achados e índices
citados aqui são dados de teste do motor, não análise. Este relatório não é homologação
jurídica, econômica nem da integração em execução real.

## Resultados

| # | Comando (diretório) | Resultado |
|---|---|---|
| 1 | `python -m pytest` (`backend/`) | **135 passed** (120 anteriores + 15 novos) |
| 2 | `python -m pytest --cov=evidia` (`backend/`) | cobertura total **95%** (adaptador 84%, serviço 91%, rotas 100%) |
| 3 | `python -m ruff check .` e `ruff format --check .` (`backend/`) | sem pendências |
| 4 | `alembic upgrade head` no banco local | `0003 (head)` aplicada |
| 5 | `npm test` (raiz) | **39 passed** em 5 arquivos (36 anteriores + 3 novos) |
| 6 | `npx tsc --noEmit` e `npm run build` (raiz) | exit 0 |
| 7 | `npm run lint` (raiz) | exit 1 — **mesma falha preexistente** em `vite.config.ts:16`; nenhum problema nos arquivos novos |
| 8 | `python scripts/smoke_e2e.py` (`backend/`, serviços no ar) | **APROVADO** |
| 9 | `python scripts/nulidade360_check.py` (`backend/`, contra o Nulidade360 real em `MOCK_AI`) | **APROVADO**, 13 checagens |
| 10 | `python scripts/ui_journey.py` (`backend/`, Edge) | **APROVADO**, 64 checagens (56 anteriores + 8 novas), sem erro de console |

## Como o motor foi executado

- Processo do Nulidade360 iniciado a partir de `backend/data/nulidade360_sandbox`, com
  `MOCK_AI=true` e chave de IA propositalmente inválida (`start_nulidade360_mock.ps1`).
- O motor grava banco, uploads e logs relativos à pasta de trabalho, então tudo foi escrito na
  pasta isolada. Conferido: a lista de casos do serviço começou vazia (não era o banco do
  projeto) e nenhum arquivo do projeto do Nulidade360 foi modificado nesta sessão; o banco
  dele mantém a data de 06/08/2026.
- A Evidia foi iniciada com `EVIDIA_NULIDADE360_MODE=mock` apenas no terminal; o
  `backend/.env` não foi alterado.

## Aceites cobertos

| Aceite | Onde | Situação |
|---|---|---|
| RF04 posição explícita e confirmada; padrão “Polo Passivo” do motor nunca usado | `test_engines.py`, `nulidade360_check.py`, `ui_journey.py` | Passa |
| AC05 achado sem citação resolvível fica pendente e não validado | os três | Passa — o modo de teste do motor atribui a evidência a outro arquivo e sem página; a Evidia trata como pendência |
| AC06 bloco falho mantém parcial, mesmo com rótulo “concluído” | `test_engines.py` | Passa **com dublê do motor**: o modo simulado nunca falha um bloco, então o caso não pôde ser provocado no serviço real |
| AC20 repetir o pedido ou reconciliar não duplica envio nem achado; execução interrompida antes da confirmação fica irreconciliável, sem reenvio | `test_engines.py`; repetição também em `nulidade360_check.py` | Passa. Reinício real do servidor no meio de uma execução **não foi exercitado** |
| RF04 documento novo deixa a execução desatualizada, ainda consultável | `test_engines.py` | Passa |
| Falha do motor é erro tipado, sem resultado presumido | `test_engines.py` | Passa (indisponível, tempo esgotado, resposta fora do contrato) |
| AC18 achados em tela inteira com “← Voltar” e detalhe na URL | `ui_journey.py` | Passa |

## Observações sobre o motor (não corrigidas: o Nulidade360 não foi alterado)

1. A resposta de análise não informa `checklist_version` nem `prompt_version`; a Evidia lê a
   versão do checklist em `/api/checklist/active` e deixa a versão do prompt como não informada.
2. O motor não informa custo nem uso de tokens: o custo fica nulo (“Não informado”).
3. Iniciar a análise não devolve identificador; a Evidia cria um caso por execução e
   reconcilia por ele.
4. No modo de teste, as evidências citam um arquivo fixo (`processo_recorte_real.txt`), não o
   documento enviado.

## Limites e pendências

- **Não executado:** análise real (API paga); PDF; reinício do servidor durante execução;
  leitor de tela; navegadores além do Edge; carga; contêiner Docker.
- **Fora desta entrega:** mapa de evidências e relatório .docx do motor; revisão de achado na
  tela; vínculo de achado com afirmações e valores; trabalhador de fila.
- **Bloqueado por dependência:** execução real do Nulidade360 e P4 (custo e autorização);
  originação real (D3); metodologia econômica (D7); política de colunas (D5).

## Artefatos

- Captura nova: `artifacts/qa/ui/09-achados-do-motor.png` (dados de teste do motor).
- Contratos regenerados: `openapi.json` e `schemas/engine_run.json`.
