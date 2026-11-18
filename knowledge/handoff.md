## 2026-11-18 09:30 - Claude Code - Execução do prompt Evidia (incremento 17, originação real)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido do usuário:** o módulo de originação não mostrava o banco de
  `originacao-pipeline`; verificar e, se não mostrasse, inserir.
- **Constatado:** a Evidia estava em `EVIDIA_ORIGINATION_MODE=fixture` (4 casos sintéticos). O
  banco real (`coletor/originacao.sqlite`) tem 973 linhas de processo, 956 CNJs distintos, 4
  leads, de 9 consultas; não tem partes, estudo nem autos.
- **Feito:** leitor somente-leitura do banco (`SqliteOriginationClient`), modo `sqlite`; tela
  de seleção com busca, filtros e paginação; `backend/.env` local apontado para o banco real
  (linhas `EVIDIA_ORIGINATION_MODE` e `EVIDIA_ORIGINATION_DB_PATH`). Conferido no navegador
  contra o banco real: 956 processos, 20 páginas, 4 leads, sem erro de console; arquivo da
  originação inalterado (hash). Validado: 248 pytest (95%), 60 vitest, lint, tsc, build.
- **Nao feito:** nenhum processo foi importado como oportunidade — posição e parte são
  confirmadas por quem importa e o banco não informa as partes. Jornada de navegador e smoke
  não foram rodados nesta rodada: exigem reiniciar a API em modo sintético e havia uma
  instância do usuário em execução (iniciada às 06:17), que não foi encerrada.
- **Proximo passo:** o usuário escolhe na tela os processos a importar. Para rodar os
  roteiros de teste: `$env:EVIDIA_ENV_OVERLAY = "qa-profile.env"` antes de `.\_start.ps1`.
- **Como validar:** abrir `/operacao/entrada`: a origem aparece como “Originação”, sem a marca
  de dado sintético, com 956 processos. Em `backend/`:
  `python -m pytest tests/test_origination_sqlite.py`.

## 2026-11-18 00:30 - Claude Code - Execução do prompt Evidia (incremento 16, ajuda contextual)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido do usuário:** atualizar a ajuda de colunas, telas, botões e abas para a nova versão.
- **Feito:** ajuda das 98 colunas (`backend/evidia/services/table_help.py`) e de 38 tópicos de
  tela (`src/lib/operacao/help.ts`), no formato do guia editorial; balão em três partes.
  Validado: 242 pytest (95%), 60 vitest, lint, tsc, build, smoke 31 e jornada no Edge com 140
  checagens (cinco novas, só de ajuda).
- **Nao feito:** ajuda das telas da demonstração V3 (fora do pedido); textos não foram
  revisados por quem usa a plataforma no dia a dia.
- **Pendências anteriores continuam:** chave do provedor exposta em
  `scripts/gerar_overview_sac.py` (commit `e92fe48`, em `origin/main`) — revogar; decisão sobre
  commit; piloto (T019).
- **Proximo passo:** o usuário lê a ajuda nas telas e aponta o que ajustar; depois, commit.
- **Como validar:** subir o ambiente simulado e passar o mouse (ou o foco) nos “?” ao lado de
  títulos, colunas e botões; `npm test` e, em `backend/`, `python -m pytest tests/test_tables.py`.

## 2026-11-17 23:00 - Claude Code - Execução do prompt Evidia (incremento 15, IA real)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido do usuário:** agir como analista de fundo, usar a chave real fornecida e validar as
  rotinas por amostra, com a estratégia montada por `/test-strategy-architect` e a expectativa
  de `.specify` (constituição) e `specs/001-evidia-operacional`.
- **Feito:** estratégia (`qa/examples/evidia-operacional_test_strategy.md`); avaliação com IA
  real aprovada (27 critérios via API, 10 checagens no navegador) sobre caso sintético; cinco
  defeitos que só apareceram com modelo real corrigidos: alegação promovida a fato, cenário do
  autor atacando a própria prova, página errada em citação do motor, chave duplicada na tela e
  rótulo “réu simulado”. Modo real do Nulidade360 habilitado. Regressão simulada verde: 240
  pytest (95%), 57 vitest, lint, build, smoke 31, motor simulado 16, jornada 135.
  Relatório: `artifacts/qa/eval/2026-11-17_avaliacao_ia_real.md`.
- **Nao feito:** P4 com IA real (sem API); Nulidade360 com PDF; documentos reais; revisão
  jurídica do conteúdo. T019 (piloto) segue aberta; nada foi commitado.
- **Alerta:** a chave do provedor usada está em texto claro em `scripts/gerar_overview_sac.py`,
  no commit `e92fe48`, já em `origin/main`. Não foi alterado neste ciclo: o usuário precisa
  revogar a chave e remover o valor do arquivo.
- **Proximo passo:** usuário revoga e troca a chave; decide o commit; depois, piloto conforme
  `docs/desenvolvimento/PILOTO.md`. Pendências de produto vistas na amostra: coluna “Achado”
  mostra a pergunta do checklist; duas execuções do motor para o mesmo laudo divergiram.
- **Como validar:** modo real — `$env:NULIDADE360_GEMINI_API_KEY`,
  `backend\scripts\start_nulidade360_live.ps1`; Evidia com `EVIDIA_LLM_MODE=gemini`,
  `EVIDIA_LLM_API_KEY` e `EVIDIA_NULIDADE360_MODE=live`; em `backend/`:
  `python scripts\analyst_eval.py --case caso:N` (consome API paga).

## 2026-11-17 21:30 - Claude Code - Execução do prompt Evidia (incremento 14, fechamento)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido do usuário:** entregar todos os itens de `tasks.md`, ainda sem IA real, seguindo as
  sugestões (padrões assumidos onde havia decisão pendente).
- **Feito:** T005, T008, T009, T012 e T015 fechadas no que é código: mapa de evidências e
  relatório do Nulidade360 (conferidos contra o serviço em `MOCK_AI`), pedido de execução do P4
  com texto de entrada, diligência de fonte real por planilha, política padrão de colunas por
  papel, segregação opcional do memorando, volume medido (100 mil registros em 1,24 s),
  roteiro de homologação da originação, protocolo do piloto. Migrações `0012` e `0013`.
  Validado: 235 pytest (95%), 57 vitest, ruff, tsc, build, lint sem erros, smoke (31),
  Nulidade360 simulado (16) e jornada no Edge com 135 checagens.
  Relatório: `artifacts/qa/2026-11-17_incremento-14.md`.
- **Nao feito:** T019 — a execução do piloto real. Exige dados e fontes reais (D3), autorização
  de custo para Nulidade360, P4 e modelo de linguagem, e homologações humanas (D5, D7). Está
  preparada (`docs/desenvolvimento/PILOTO.md`), não executada. T020 — aguarda a decisão do
  usuário sobre o commit; nada foi commitado.
- **Padrões assumidos (a confirmar):** leitor não vê identificador na origem, hash e nome de
  arquivo; memorando pode ser aprovado por quem emitiu (mudar com
  `EVIDIA_MEMO_DISTINCT_APPROVER=true`); dossiê abre na visão completa; T013/T017 concluídas
  com metodologia rotulada como não homologada.
- **Proximo passo:** o usuário decide o commit (e se as capturas de `artifacts/qa/ui/`, 13 MB,
  entram) e as decisões D3, D5, D6, D7; com isso, seguir `docs/desenvolvimento/PILOTO.md`.
- **Como validar:** igual à entrada anterior; a conferência do motor simulado agora cobre mapa
  de evidências e relatório (`python scripts\nulidade360_check.py`), e há
  `python scripts\table_volume.py` e `python scripts\origination_check.py`.

## 2026-11-17 19:30 - Claude Code - Execução do prompt Evidia (incrementos 11 a 13)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido do usuário:** levar todas as tarefas de `tasks.md` até o fim, deixando de fora só
  testes reais com IA que consomem tokens. Sem commit/push.
- **Feito:** T013, T014, T016 e T017 concluídas; T004 com Docker; T005, T015 avançadas.
  Economia `econ-1.2.0` (impactos, sensibilidade, memorando com decisão), seis etapas com estado
  no servidor, tabela comum (arrasto, lote, lacunas, cenários), vínculo achado–afirmação,
  relatórios derivados da originação, imagem Docker do backend. Migrações `0009` a `0011`.
  Validado: 223 pytest (95%), 57 vitest, ruff, tsc, build, smoke (31), Nulidade360 simulado (13)
  e jornada no Edge com 128 checagens. Relatório: `artifacts/qa/2026-11-17_incrementos-7-13.md`.
- **Nao feito:** T019 (piloto real e homologação humana) — depende de D3, D5, D6, D7 e de
  execuções reais com IA paga. Ficam parciais por causa externa: T005 (originação real, D3),
  T008 (execução real do Nulidade360; mapa de evidências e relatório .docx do motor não foram
  integrados porque o comportamento e o custo dessas rotas não estão inventariados), T009
  (disparar o P4), T012 (conector de fonte real), T015 (política de colunas D5, volume D6),
  T020 (revisão de diff e `.gitignore` com o usuário antes de commit). `npm run lint` segue com
  a falha antiga em `vite.config.ts:16`.
- **Proximo passo:** revisar com o usuário o diff e o `.gitignore` (nada foi commitado) e
  decidir D3, D5, D6 e D7; só então homologar com dados e motores reais.
- **Como validar:** `.\backend\scripts\start_nulidade360_mock.ps1 -Nulidade360Home <pasta>`;
  com `EVIDIA_NULIDADE360_MODE=mock`, `EVIDIA_NULIDADE360_BASE_URL=http://127.0.0.1:8530` e
  `EVIDIA_DILIGENCE_MODE=fixture`, `.\_start.ps1 -NoBrowser`; em `backend/`: `python -m pytest`,
  `python scripts\ui_journey.py`. Encerrar: `backend\scripts\stop_local.ps1 -IncludeNulidade360`.
  Container: `docker compose -f docker-compose.operacao.yml up --build` com
  `EVIDIA_ADMIN_PASSWORD` no ambiente.

## 2026-11-17 17:30 - Claude Code - Execução do prompt Evidia (incrementos 9 e 10)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido vigente do usuário:** levar todas as tarefas de `tasks.md` até o fim, deixando de
  fora só testes reais com IA que consomem tokens. Sem commit/push.
- **Feito:** T010 concluída (contraditório: `backend/evidia/services/scenarios.py`,
  `routers/scenarios.py`, `prompts/adversarial_v1.txt`, tela `ScenariosSection.tsx`, migração
  `0007`). T009 parcial (importação do relatório do P4: `adapters/p4.py`, `services/p4.py`,
  tela `P4Section.tsx`, migração `0008`; conferido contra os 13 relatórios reais do disco, só
  contagens). Tabelas comuns `p4_items` e `engine_findings`. Validado: 188 pytest (95%),
  50 vitest, ruff, tsc, e jornada no Edge com 94 checagens.
- **Nao feito (próximos incrementos, nesta ordem):** 11) economia T013/T017 (grupos de
  dependência entre impactos, sensibilidade, responsável e confiança por componente,
  memorando versionado, vínculo de achado validado com impacto); 12) navegação pelas seis
  etapas e redirecionamento das URLs antigas T014; tabelas T015 (arrasto de colunas, ações em
  massa, política de colunas por papel, lacunas e cálculos na tabela comum); 13) originação
  T005 (PDFs derivados), Docker do backend T004, fechamento T019/T020 (Walkthrough, PRD,
  Task.md, relatório de QA consolidado).
- **Fica de fora:** execução real com IA paga (Nulidade360 real, P4, modelos); conector de
  fonte real de diligência e originação real (D3); homologações humanas (D5, D6, D7).
- **Como validar:** subir com `EVIDIA_NULIDADE360_MODE=mock`,
  `EVIDIA_NULIDADE360_BASE_URL=http://127.0.0.1:8530`, `EVIDIA_DILIGENCE_MODE=fixture`; em
  `backend/`: `python -m pytest`, `python scripts\ui_journey.py`. Encerrar:
  `backend\scripts\stop_local.ps1 -IncludeNulidade360`.
## 2026-11-17 15:10 - Claude Code - Execução do prompt Evidia (incremento 8)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido vigente do usuário:** levar todas as tarefas de `tasks.md` até o fim, deixando de
  fora só testes reais com IA que consomem tokens. Sem commit/push.
- **Feito:** T011 concluída e T012 parcial (só falta conector de fonte real, que depende de
  D3). Diligência de vínculos: `backend/evidia/domain/diligence.py`,
  `adapters/diligence.py`, `services/diligence.py`, `routers/diligence.py`,
  `schemas_diligence.py`, tabelas `process_roles` e `occurrences` em `services/tables.py`,
  migração `0006` aplicada. Tela: `src/components/operacao/DiligenceSection.tsx`,
  `src/lib/operacao/diligence.ts`. Validado: 171 pytest (95%), 48 vitest, ruff, tsc, smoke e
  jornada no Edge (84 checagens).
- **Nao feito (próximos incrementos, nesta ordem):** 9) contraditório T010; 10) P4 T009;
  11) economia T013/T017 (grupos de dependência, sensibilidade, memorando, vínculo com
  achados); 12) navegação por etapas T014 e tabelas T015/T016 (arrasto, ações em massa,
  política de colunas, achados na tabela comum); 13) originação T005 (PDFs derivados),
  Docker do backend T004, fechamento T019/T020.
- **Fica de fora:** execução real com IA paga (decisão do usuário); conector de fonte real
  e homologações humanas (D3, D5, D6, D7), que não dependem de mim.
- **Como validar:** subir com `EVIDIA_NULIDADE360_MODE=mock`,
  `EVIDIA_NULIDADE360_BASE_URL=http://127.0.0.1:8530` e `EVIDIA_DILIGENCE_MODE=fixture` no
  terminal; em `backend/`: `python -m pytest`, `python scripts\ui_journey.py`. Encerrar:
  `backend\scripts\stop_local.ps1 -IncludeNulidade360`.
## 2026-11-17 13:40 - Claude Code - Execução do prompt Evidia (incremento 7)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Pedido vigente do usuário (2026-11-17):** levar TODAS as tarefas de
  `specs/001-evidia-operacional/tasks.md` até o fim, deixando de fora somente testes reais
  com IA que consomem tokens. Sem commit/push. Trabalhar por incrementos, registrando aqui.
- **Feito:** T006, T007 e T018 concluídas; T008 avançou. Texto por página + OCR local
  (`evidia/domain/texts.py`, `ocr.py`, `services/documents.py`), estrutura do documento,
  evidências de afirmação (`services/evidences.py`), sugestões por regras e por modelo
  (`domain/extraction.py`, `evidia/llm.py`, `prompts/claim_extraction_v1.txt`), fila e
  trabalhador (`services/jobs.py`, `evidia/worker.py`), rotas em `routers/documents.py`,
  migração `0005` aplicada. Tela: `DocumentDetail.tsx`, `ClaimEvidences.tsx`. Validado:
  157 pytest (95%), 45 vitest, ruff, tsc, smoke, `nulidade360_check.py` e jornada no Edge
  (74 checagens, com OCR real).
- **Nao feito (ordem planejada dos próximos incrementos):** 8) diligência de vínculos
  T011/T012; 9) contraditório T010; 10) P4 T009; 11) economia T013/T017 (grupos de
  dependência, sensibilidade, memorando); 12) navegação por etapas T014 e tabelas T015/T016
  (arrasto, ações em massa, política de colunas, achados na tabela comum); 13) originação
  T005 (PDFs derivados), Docker do backend T004, fechamento T019/T020.
- **Fica de fora por decisão do usuário:** qualquer execução real com IA paga (Nulidade360
  real, P4, sugestão por modelo real). Também não dependem de mim: D3 (credencial da
  originação), D5, D6, D7 (homologação humana).
- **Como validar:** `docs/desenvolvimento/NULIDADE360_LOCAL.md`; em `backend/`:
  `python -m pytest`, `python scripts\smoke_e2e.py`, `python scripts\nulidade360_check.py`,
  `python scripts\ui_journey.py`. Encerrar serviços: `backend\scripts\stop_local.ps1
  -IncludeNulidade360`.
## 2026-11-17 11:45 - Claude Code - Execução do prompt Evidia (incremento 6)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Feito:** mesma branch `ia-feature/evidia-operacional`, nada commitado. T016 segue parcial,
  agora com revisão de achado do motor: `review_finding` em `backend/evidia/services/engines.py`,
  rota `POST /api/v1/engine-findings/{id}/reviews`, tabela `engine_finding_reviews` (migração
  `0004`, aplicada no banco local), formulário e histórico em
  `src/components/operacao/EnginesSection.tsx`. Validado: 138 pytest (95% de cobertura),
  41 vitest, ruff, tsc, build, verificação ponta a ponta, `nulidade360_check.py` contra o
  Nulidade360 em `MOCK_AI` e jornada no Edge (67 checagens).
- **Nao feito:** vínculo de achado com afirmações e valores; achados na tabela comum;
  execução real do Nulidade360 (API paga, não autorizada e bloqueada no código). Na prática
  nenhum achado pode ser validado hoje, porque só existem execuções simuladas — a validação
  foi provada com dublê do motor. Continuam bloqueados: originação real (D3), P4,
  contraditório, diligência, homologação econômica (D7). `npm run lint` segue com a falha
  preexistente em `vite.config.ts`. Sem commit/push; decisão sobre `.specify` e capturas
  pendente.
- **Proximo passo:** depende do usuário — autorizar (ou não) uma execução real do Nulidade360
  em caso escolhido e com teto de custo; ou D3. Sem custo, resta levar os achados à tabela
  comum e ligar achado a afirmação.
- **Como validar:** `docs/desenvolvimento/NULIDADE360_LOCAL.md`; em `backend/`:
  `python -m pytest`, `python scripts\nulidade360_check.py`, `python scripts\ui_journey.py`.
  Relatório: `artifacts/qa/2026-11-17_incremento-6.md`.
## 2026-11-17 10:40 - Claude Code - Execução do prompt Evidia (incremento 5)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Feito:** mesma branch `ia-feature/evidia-operacional`, nada commitado. O usuário autorizou
  ("pode prosseguir") subir o Nulidade360 local em modo simulado. T008 parcial: adaptador HTTP
  (`backend/evidia/adapters/nulidade360.py`), serviço e rotas de execução
  (`services/engines.py`, `routers/engines.py`), tabelas `engine_runs`/`engine_findings`
  (migração `0003`, aplicada no banco local). T016 parcial: seção do motor no dossiê
  (`src/components/operacao/EnginesSection.tsx`). Validado: 135 pytest (95% de cobertura),
  39 vitest, ruff, tsc, build, verificação ponta a ponta, `scripts/nulidade360_check.py`
  contra o Nulidade360 real em `MOCK_AI` (13 checagens) e jornada no Edge (64 checagens).
- **Nao feito:** execução real do Nulidade360 (API paga, PDF) — não autorizada e bloqueada no
  código; conferência do adaptador com saídas reais; mapa de evidências e relatório .docx do
  motor; revisão de achado na tela; trabalhador de fila (a reconciliação é pedida pela tela).
  Continuam bloqueados: originação real (D3), P4, contraditório, diligência, homologação
  econômica (D7). `npm run lint` segue com a falha preexistente em `vite.config.ts`. Sem
  commit/push; decisão sobre `.specify` e capturas pendente.
- **Proximo passo:** depende do usuário — autorizar (ou não) uma execução real do Nulidade360
  em um caso escolhido, com teto de custo; ou D3 para a originação. Sem custo, o que resta é a
  revisão de achados na tela e levar os achados à tabela comum.
- **Como validar:** `docs/desenvolvimento/NULIDADE360_LOCAL.md` (subir o motor simulado em
  pasta isolada, ligar `EVIDIA_NULIDADE360_MODE=mock` no terminal e rodar
  `python scripts\nulidade360_check.py` e `python scripts\ui_journey.py` em `backend/`).
  Relatório: `artifacts/qa/2026-11-17_incremento-5.md`. O `backend\.env` não foi alterado: a
  integração fica desligada por padrão. Dados de teste do motor em
  `backend/data/nulidade360_sandbox` (ignorado pelo Git).
## 2026-11-17 09:25 - Claude Code - Execução do prompt Evidia (incremento 4)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Feito:** mesma branch `ia-feature/evidia-operacional`, nada commitado. T003 concluída:
  contratos de execução de motor, achado e contraditório (`backend/evidia/schemas_engines.py`,
  `domain/engines.py`, `fixtures/engines.py`), exportados em `contracts/schemas/` e
  `contracts/fixtures/motores_sinteticos.json`, com AC05–AC08 testados sobre exemplos
  sintéticos. Mensagens do servidor acentuadas (68 textos; códigos de erro inalterados).
  Validado: 120 pytest (96% de cobertura), ruff, verificação ponta a ponta e jornada no Edge
  (56 checagens). Frontend não mudou neste incremento (36 vitest, tsc e build do incremento 3).
- **Nao feito:** os contratos de motor não têm rota nem foram conferidos com saída real de
  motor (fica em T008/T009). As descrições das lacunas geradas na importação continuam sem
  acento: fazem parte do conteúdo do snapshot e mudá-las alteraria o hash de versões já
  importadas. Continuam bloqueados: originação real (D3), Nulidade360/P4, contraditório,
  diligência, homologação econômica (D7). `npm run lint` segue com a falha preexistente em
  `vite.config.ts`. Sem commit/push; decisão sobre `.specify` e capturas pendente.
- **Proximo passo:** depende do usuário — D3 (credencial somente-leitura e caso autorizado)
  para homologar T005, ou autorização para subir o Nulidade360 local e fazer o T008 em modo
  simulado. Não resta trabalho de valor que não dependa de uma dessas respostas.
- **Como validar:** `.\_start.ps1 -NoBrowser`; em `backend/`: `python -m pytest`,
  `python scripts\smoke_e2e.py`, `python scripts\ui_journey.py`. Relatório:
  `artifacts/qa/2026-11-17_incremento-4.md`. Atenção ao encerrar a API: o `--reload` do
  uvicorn deixa um processo filho (`multiprocessing-fork`) segurando a porta 8007 se só o pai
  for encerrado; encerrar a árvore inteira.
## 2026-11-17 08:20 - Claude Code - Execução do prompt Evidia (incremento 3)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Feito:** mesma branch `ia-feature/evidia-operacional`, nada commitado. T015 segue parcial,
  agora também no dossiê: tabelas `documents` (uma linha por versão) e `claims` em
  `backend/evidia/services/tables.py`, escopadas por `scope_id` com conferência de organização;
  `DataTable` com `scopeId` e `rowActions`; `DocumentsSection` e `ClaimsSection` usando a tabela
  comum; consulta na URL do dossiê (`docs`, `afirm`). Sem migração nova. Validado: 102 pytest
  (95% de cobertura), 36 vitest, ruff, tsc, build, verificação ponta a ponta e jornada no Edge
  (56 checagens, executada três vezes seguidas sem falha, com paginação de duas páginas).
- **Nao feito:** arrasto de colunas e ações em massa; política de colunas por papel (D5);
  painéis nas bordas superior e esquerda não exercitados na interface; lacunas e execuções de
  cálculo continuam em lista simples; acentuação das mensagens de erro antigas do servidor.
  Continuam bloqueados: originação real (D3), Nulidade360/P4, contraditório, diligência,
  homologação econômica (D7). `npm run lint` segue com a falha preexistente em
  `vite.config.ts`. Sem commit/push; decisão sobre `.specify` e capturas pendente.
- **Proximo passo:** D3 (credencial somente-leitura e caso autorizado) para homologar T005;
  ou autorização para subir o Nulidade360 local e fazer o T008 em modo simulado. Sem depender
  de terceiros resta pouco de valor: acentuar as mensagens de erro do servidor e completar os
  schemas de T003.
- **Como validar:** `.\_start.ps1 -NoBrowser`; em `backend/`: `python -m pytest`,
  `python scripts\smoke_e2e.py`, `python scripts\ui_journey.py`. Relatório:
  `artifacts/qa/2026-11-17_incremento-3.md`.
## 2026-11-16 22:05 - Claude Code - Execução do prompt Evidia (incremento 2)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Feito:** mesma branch `ia-feature/evidia-operacional`, nada commitado. T015 parcial:
  tabela comum na lista de oportunidades, resolvida no servidor (filtros, facetas, ordenação,
  paginação, seleção por ID, colunas, visões salvas, exportação CSV); rotas `/api/v1/tables/*`,
  migração `0002`. T017 parcial: demonstrativos no dossiê com memória de cálculo em tela
  inteira e exportação; motor `econ-1.1.0` (mesma fórmula, saída com memória). Corrigido o
  envio simulado da demo que aparecia em `/operacao`. Validado: 97 pytest (95% de cobertura),
  34 vitest, ruff, tsc, build, verificação ponta a ponta e jornada no Edge (48 checagens).
- **Nao feito:** tabela comum nas tabelas do dossiê; sensibilidade e vínculo dos valores com
  achados; política de colunas por papel (D5); duas páginas e as bordas superior/esquerda não
  foram exercitadas na interface (AC17 coberto no servidor); acentuação das mensagens de erro
  do servidor fora do motor. Continuam bloqueados: originação real (D3), Nulidade360/P4,
  contraditório, diligência, homologação econômica (D7). `npm run lint` segue com a falha
  preexistente em `vite.config.ts`. Sem commit/push; decisão sobre `.specify` e capturas pendente.
- **Proximo passo:** D3 (credencial somente-leitura e caso autorizado) para homologar T005.
  Sem depender de terceiros: levar a tabela comum às tabelas do dossiê; T008 com `MOCK_AI` e
  arquivo `.txt` (sem custo) exige antes autorização para subir o Nulidade360 local.
- **Como validar:** `.\_start.ps1 -NoBrowser`; em `backend/`: `python -m pytest`,
  `python scripts\smoke_e2e.py`, `python scripts\ui_journey.py`. Relatório:
  `artifacts/qa/2026-11-16_incremento-2.md`.
## 2026-11-16 19:55 - Claude Code - Execução do prompt Evidia (incremento 1)

- **Session ID:** 0fe8c347-01e3-41a0-a676-58adadb348f8
- **Feito:** branch `ia-feature/evidia-operacional` (base `main` 5f3a45d, nada commitado).
  T001 inventário (`specs/001-evidia-operacional/research.md`), T002 ADRs (`adr/decisoes.md`),
  T003 contratos (`contracts/`, parcial), T004 scaffold `backend/` (FastAPI, SQLite + Alembic,
  Loguru/auditoria, `.env.example`, inicializadores). Jornada vertical entrada → snapshot →
  dossiê → revisão com telas em `/operacao`. Motor econômico com AC13–AC16. Validado:
  82 testes pytest (95% de cobertura), 10 vitest, ruff, tsc, build, verificação ponta a ponta
  (31 checagens) e jornada no Edge (22 checagens). App cadastrado no Painel (5180 / 8007).
- **Nao feito:** homologação com a originação real (falta credencial de serviço — D3);
  adaptadores Nulidade360 e P4 (T008–T009); contraditório (T010); diligência (T011–T012);
  tela dos demonstrativos (T017); tabela configurável (T015); jobs assíncronos; OCR; gestão de
  usuários (D5); Docker do backend. `npm run lint` continua falhando por erro **preexistente**
  em `vite.config.ts`. Sem commit/push: `.specify` segue ignorado e o destino dos dados
  sintéticos e das capturas em `artifacts/qa/ui/` precisa ser decidido antes de versionar.
- **Proximo passo:** decidir D3 (credencial somente-leitura na originação e caso autorizado)
  para homologar T005; em paralelo, T015 (tabela comum) e T017 (tela dos demonstrativos),
  que não dependem de terceiros. Depois T008 com `MOCK_AI` e arquivo `.txt`.
- **Como validar:** `.\_start.ps1 -NoBrowser`; em `backend/`: `python -m pytest`,
  `python scripts\smoke_e2e.py`, `python scripts\ui_journey.py`. Relatório:
  `artifacts/qa/2026-11-16_incremento-1.md`.
## 2026-11-16 16:23 - Codex - Constituição e refinamento Evidia

- **Session ID:** não confirmado por ferramenta de sessão.
- **Feito:** criada constituição inicial 1.0.0 por autorização; templates sincronizados;
  requisitos 0.3 com RF01–RF19/AC01–AC22, plano, tarefas e prompt Claude preparados.
  D1/D2 preservadas; orientações V3 delimitadas como histórico. Código funcional intacto.
- **Nao feito:** implementação, testes das aplicações, piloto real, commit/push/deploy.
  `.specify` continua ignorado no Git; política de versionamento requer decisão antes de commit.
- **Proximo passo:** abrir Claude Code na raiz, usar docs/desenvolvimento/PROMPT_CLAUDE_CODE.md
  e executar T001–T003; resolver somente lacunas dependentes de negócio/acesso.
- **Como validar:** conferir constituição, templates, `specs/001-evidia-operacional/` e relatório documental
  no pacote entregue; resultados de aplicação históricos não valem como homologação nova.

