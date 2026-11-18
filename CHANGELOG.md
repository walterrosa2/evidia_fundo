# Histórico

## 2026-11-18 — incremento 17: originação lendo o banco real (não lançado)

- Novo modo `EVIDIA_ORIGINATION_MODE=sqlite` com `EVIDIA_ORIGINATION_DB_PATH`: leitura direta e
  somente-leitura de `originacao-pipeline/coletor/originacao.sqlite` (conexão `mode=ro`).
  Nada é alterado no projeto da originação.
- Candidato ganha tribunal, situação na origem, data de distribuição, marca de lead e CNPJ
  consultado; o snapshot guarda esses dados em `origin_details` (só quando a origem informa).
- Tela “Selecionar na Originação”: busca, filtros por tribunal, situação e lead, e paginação.
- Perfil de testes `backend/qa-profile.env`, aplicado com `EVIDIA_ENV_OVERLAY`, para rodar os
  roteiros com dados sintéticos sem editar o `.env`.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-18 — incremento 16: ajuda contextual da operação (não lançado)

- Ajuda das 98 colunas das nove tabelas comuns reescrita no formato do guia editorial (o que
  é / como é calculado / como ler), em `backend/evidia/services/table_help.py`; antes, 22
  colunas tinham ajuda, curta.
- Ajuda de seções, etapas, abas, botões e campos em `src/lib/operacao/help.ts` (38 tópicos),
  aplicada com os componentes `Help` e `WithHelp`.
- Balão de ajuda (`HelpHint`): três partes em linhas separadas, com o rótulo em destaque, e
  mais largo quando o texto tem partes. A ajuda da demonstração não muda.
- Testes: toda coluna e todo tópico precisam ter as três partes e seguir o guia editorial.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incremento 15: avaliação com IA real e correções (não lançado)

- Estratégia de testes em `qa/examples/evidia-operacional_test_strategy.md`; avaliação por
  amostra com IA real em `backend/scripts/analyst_eval.py` e `ui_analyst_real.py`, sobre caso
  sintético (`backend/scripts/eval_data/`). Relatório:
  `artifacts/qa/eval/2026-11-17_avaliacao_ia_real.md`.
- Nulidade360: modo real (`EVIDIA_NULIDADE360_MODE=live`, `start_nulidade360_live.ps1`).
  `/health` informa `nulidade360_mode` e `llm_mode`.
- Citação de achado: o trecho é conferido contra o texto da página; página errada é corrigida
  e trecho não localizado vira pendência.
- Sugestão de afirmações: prompt `claim_extraction_v2`; em peça de parte, constatação do modelo
  entra como alegação (`nature_adjusted` na resposta).
- Contraditório: prompt `adversarial_v2`; citação do argumento leva o trecho da afirmação.
- Tela: chaves de lista corrigidas, “lado analisado” no lugar de “réu simulado”, aviso de
  modo real.
- Consumo de API paga nesta rodada, autorizado pelo usuário: amostra em `gemini-2.5-flash` e
  duas análises reais do Nulidade360. Sem commit, push ou deploy.

## 2026-11-17 — incremento 14: integrações sem custo e fechamento (não lançado)

- Nulidade360: mapa de evidências na execução (`evidence_map_version_id`) e relatório do motor
  em `GET /api/v1/engine-runs/{id}/report`. Migração `0012`.
- P4: pedido de execução com texto de entrada (`/opportunities/{id}/p4-requests`,
  `/p4-requests/{id}/package`, `/cancel`); `request_id` na importação fecha o pedido.
  Migração `0013`.
- Diligência: resultado de fonte real por planilha
  (`/opportunities/{id}/diligence-searches/file`).
- Tabela comum: política de colunas por papel (`EVIDIA_COLUMN_POLICY`) e carga de afirmações
  por colunas; medição em `backend/scripts/table_volume.py`.
- Memorando: `EVIDIA_MEMO_DISTINCT_APPROVER` exige aprovador diferente do emissor.
- Roteiro `backend/scripts/origination_check.py` (homologação somente-leitura da origem) e
  protocolo do piloto em `docs/desenvolvimento/PILOTO.md`.
- `vite.config.ts`: duas linhas em branco removidas; `npm run lint` volta a passar.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incrementos 11 a 13: economia, etapas e fechamento (não lançado)

- Economia `econ-1.2.0`: impactos com grupo de dependência (sem dupla contagem), sensibilidade,
  responsável e confiança por componente, limitações gravadas com o resultado. Sem impactos, os
  números são os da fórmula anterior.
- Fonte de impacto só validada: `GET /api/v1/opportunities/{id}/impact-sources`.
- Memorando versionado: `/opportunities/{id}/memos`, `/memos/{id}/export`, `/memos/{id}/decision`.
  Migrações `0009` e `0010`.
- Seis etapas da jornada: `GET /api/v1/opportunities/{id}/stages`; dossiê com `?etapa=`; URLs
  antigas com `?oportunidade=<id>` redirecionam para a etapa.
- Tabela comum: arrasto de colunas, coluna monetária, tabelas `missing_pieces` e
  `calculation_scenarios`, ação em massa `/opportunities/{id}/claims/bulk-review`.
- Vínculo achado–afirmação: `/engine-findings/{id}/claim-links`. Migração `0011`.
- Relatórios derivados da originação: `/opportunities/{id}/origin-documents`.
- Docker do backend: `backend/Dockerfile` e `docker-compose.operacao.yml` (homologação local).
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incrementos 9 e 10: contraditório e P4 (não lançado)

- Contraditório bilateral: pedidos, cenários por participante e lado, argumentos com
  evidência conferida e comparação dos dois lados. Rotas `/api/v1/opportunities/{id}/pleas`,
  `/pleas/{id}/scenario-runs`, `/scenario-runs/{id}/arguments`, `/pleas/{id}/comparison`.
  Migração `0007`.
- P4: importação do relatório de uma execução feita fora da Evidia
  (`/api/v1/opportunities/{id}/p4-imports`), nos três formatos reais; a Evidia não executa o
  P4. Migração `0008`.
- Tabelas comuns novas: itens do P4 e achados do motor.
- `backend/scripts/stop_local.ps1` corrigido: identificava o projeto pela pasta errada e não
  encerrava o frontend.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incremento 8: diligência de vínculos (não lançado)

- Participantes, papéis por processo e identidade: homônimos nunca são unidos
  automaticamente; unir fichas é ato de revisor, com motivo, e pode ser desfeito.
- Janela de cinco anos pela data do ato, cruzamentos e recorrência com denominador, sem
  qualificar a frequência; relação esperada do assistente com a parte não gera alerta.
- Pesquisa em fonte com cobertura declarada; falha de fonte e “nada encontrado” são estados
  diferentes. Só existe conector sintético: fonte real depende de D3.
- Ocorrências com ficha, revisão, histórico e dossiê exportável em CSV.
- Novas rotas `/api/v1/opportunities/{id}/participants`, `/diligence-searches`,
  `/diligence/crosscheck`, `/occurrences`, `/diligence/export` e correlatas. Migração `0006`.
- Configuração nova: `EVIDIA_DILIGENCE_MODE` (`disabled` por padrão). Dependência: `tzdata`.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incremento 7: texto, OCR, fila e extração (não lançado)

- Texto por página no recebimento do documento e **OCR local** (Tesseract) para PDF
  digitalizado e imagem; nada sai da máquina.
- Estrutura do documento: peças com intervalo de páginas e numeração de folhas do processo.
- Fila de trabalhos no banco com trabalhador em segundo plano: nova tentativa vinculada,
  retomada após reinício e reconciliação das execuções de motor (ADR-004).
- Sugestão de afirmações por regras locais ou por modelo de linguagem; a saída do modelo é
  conferida contra a página e nunca gravada sem aceite. Evidências favoráveis e contrárias.
- Proteção contra instrução embutida em documento (AC21).
- Configuração nova: `EVIDIA_WORKER_*`, `EVIDIA_TESSERACT_CMD`, `EVIDIA_OCR_*`, `EVIDIA_LLM_*`
  (`EVIDIA_LLM_MODE=disabled` por padrão). Dependências: `pypdfium2`, `pillow`, `openpyxl`.
- Migração `0005`. Script `backend/scripts/stop_local.ps1` para encerrar os serviços locais.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incremento 6: revisão de achados do motor (não lançado)

- Revisão de achado do motor na tela e na API (`POST /api/v1/engine-findings/{id}/reviews`):
  histórico com antes e depois, fundamento obrigatório para validar ou descartar e citação
  informada pelo revisor. Tabela `engine_finding_reviews` (migração `0004`).
- Um achado não pode ser validado sem evidência resolvível, se veio de execução em modo
  simulado ou se a execução ficou desatualizada; a tela mostra os impedimentos.
- A saída original do motor não é alterada pela revisão.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incremento 5: Nulidade360 em modo simulado (não lançado)

- Adaptador do Nulidade360 (T008, parcial): execuções de motor por HTTP, **somente em modo
  simulado** — o motor roda com `MOCK_AI` e recebe apenas `.txt`/`.md`. Nenhuma API paga é
  consumida; PDF é recusado.
- Novas rotas `/api/v1/opportunities/{id}/engine-runs`, `/api/v1/engine-runs/{id}/refresh` e
  `/api/v1/engine-runs/{id}/findings`; tabelas `engine_runs` e `engine_findings` (migração `0003`).
- Seção “Auditoria de Nulidades (Nulidade360)” no dossiê (T016, parcial): pedido com lado
  confirmado, acompanhamento, blocos não concluídos, achados em tela inteira.
- Configuração nova: `EVIDIA_NULIDADE360_MODE` (`disabled` por padrão), `_BASE_URL`,
  `_TIMEOUT_SECONDS`, `_DEADLINE_MINUTES`. Script `backend/scripts/start_nulidade360_mock.ps1`
  e guia `docs/desenvolvimento/NULIDADE360_LOCAL.md`.
- O projeto do Nulidade360 não foi alterado: o serviço rodou em pasta isolada.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incremento 4: contratos de motor e textos do servidor (não lançado)

- T003 concluída: contratos de execução de motor, achado e contraditório em
  `backend/evidia/schemas_engines.py`, regras em `backend/evidia/domain/engines.py`, JSON Schema
  e exemplos sintéticos exportados em `specs/001-evidia-operacional/contracts/`. Ainda sem rota
  e sem execução de motor real.
- Mensagens de erro e avisos do servidor acentuados (68 textos); "não encontrado/encontrada"
  concorda com o recurso. Os códigos de erro não mudaram.
- Não alterados de propósito: as descrições das lacunas geradas na importação e a fixture da
  originação, porque entram no conteúdo cujo hash identifica a versão do snapshot.
- Sem commit, push, deploy ou consumo de API paga.

## 2026-11-17 — incremento 3: tabela comum no dossiê (não lançado)

- As tabelas de documentos e de afirmações do dossiê passam a usar a tabela comum (T015,
  ainda parcial): filtros, ordenação, paginação, seleção, colunas, visões e exportação CSV
  resolvidos no servidor, restritos à oportunidade aberta.
- API: `TableQuery.scope_id` (obrigatório nas tabelas `documents` e `claims`),
  `TableColumnOut.default_width` e `TableRow.refs`. Sem migração nova.
- A consulta de cada tabela fica na URL do dossiê e é preservada ao abrir e fechar a ficha
  ou a memória de cálculo.
- Roteiro de interface: espera pelo fim da atualização da tabela em vez de rede ociosa
  (corrigia leitura da página anterior); paginação de duas páginas exercitada na interface.
- Sem commit, push, deploy ou consumo de API paga. Metodologia econômica segue não homologada.

## 2026-11-16 — incremento 2: tabela comum e demonstrativos na tela (não lançado)

- Tabela comum (T015, parcial) na lista de oportunidades: filtros por coluna, ordenação,
  paginação, seleção, colunas configuráveis, visões salvas e exportação CSV, tudo resolvido
  no servidor. Novas rotas `/api/v1/tables/*` e `/api/v1/table-views/*`; migração `0002`.
- Demonstrativos econômicos no dossiê (T017, parcial): entrada de premissas, resumo dos dois
  lados, memória de cálculo em tela inteira e exportação CSV
  (`/api/v1/calculations/{id}/export`).
- Motor econômico `econ-1.1.0`: mesma fórmula, saída com a memória por cenário. Execuções
  `econ-1.0.0` continuam consultáveis, sem a memória detalhada.
- Corrigido: o envio simulado da demonstração aparecia nas telas operacionais.
- Sem commit, push, deploy ou consumo de API paga. Metodologia econômica segue não homologada.

## 2026-11-16 — incremento 1: primeira jornada operacional (não lançado)

- Backend FastAPI em `backend/`: autenticação por sessão, isolamento por organização, auditoria
  JSONL, importação idempotente da originação, dossiê versionado, afirmações com revisão e
  motor econômico (autor e réu separados, sem contrato).
- Telas `/operacao`: lista, entrada pela originação, dossiê e ficha em tela inteira; a
  demonstração permanece separada e identificada.
- T001–T004 concluídas; T003, T005–T007, T013, T014 e T018 parciais. Ver `specs/001-evidia-operacional/tasks.md`.
- Portas: frontend 5180, API 8007. `_start.ps1`/`_start.bat` reescritos.
- Dependências novas: `vitest` (dev) no frontend; `backend/requirements*.txt`.
- Sem commit, push, deploy ou consumo de API paga. Integrações reais e metodologia econômica
  seguem sem homologação.
## 2026-11-16 — marco documental

- Constituição inicial 1.0.0 e templates autorizados; orientação Claude sincronizada.
- Especificação 0.3 com aceites e contratos refinados, plano e 20 tarefas de implementação.
- Preservadas avaliações separadas e fontes prioritárias confirmadas pelo usuário.
- Documentos antigos delimitados como demo; nenhum release de software ou deploy.

