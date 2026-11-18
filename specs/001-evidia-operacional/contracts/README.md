# Contratos — T003

2026-11-16. Arquivos **gerados** por `backend/scripts/export_contracts.py`; não editar à mão.
`backend/tests/test_contracts.py` falha se ficarem defasados do código.

| Arquivo | Conteúdo |
|---|---|
| `openapi.json` | Contrato v1 da API operacional (`/health`, `/api/v1/*`), gerado dos modelos Pydantic |
| `fixtures/originacao_sintetica.json` | Respostas **sintéticas** no formato da originação (`CasoSaida`, `/analisados`, `Estudo`) |
| `schemas/engine_run.json`, `finding.json`, `scenario_run.json`, `scenario_comparison.json` | JSON Schema dos contratos de motor e contraditório (`backend/evidia/schemas_engines.py`); **ainda sem rota** |
| `fixtures/motores_sinteticos.json` | Exemplos **sintéticos** desses contratos; nenhum motor real foi executado |
| `fixtures/snapshot_sintetico.json` | Snapshot normalizado (`snapshot-1`) correspondente ao caso sintético 1 |

## Regras do contrato

- **Erro:** `{"error": {"code", "message", "details"}, "correlation_id"}`. O `code` é estável.
- **Dinheiro:** texto decimal (`"1000.50"`); número de ponto flutuante é recusado (422).
- **Nulo ≠ zero:** `price`, `investor_return`, `contractual_fee` e `evidia_revenue` saem
  como `{"value": null, "reason": "contract_not_defined"}`.
- **Idempotência da importação:** organização + origem + ID externo + posição + hash do
  snapshot. Repetir devolve o mesmo `operation_id` com `outcome: "reused"` e `attempts` maior.
- **Posição e parte** são obrigatórias na importação; não há valor padrão.
- **Estados de versão de documento:** `stored | needs_ocr | password_protected`.
- **Natureza da afirmação:** `documentary_finding | attributed_allegation | analytical_inference | human_conclusion`.
- **Revisão:** `pending | in_review | validated | discarded | contested | inconclusive`;
  validar com pendência devolve 409 `validation_blocked` e a lista de bloqueios.

## Tabela comum (T015)

- `GET /api/v1/tables/{tabela}/rows?q=<TableQuery em JSON>`: filtro, ordenação e paginação
  sobre o conjunto inteiro. Valores de uma coluna combinam por OU; colunas, por E.
- `facets` de uma coluna refletem os filtros das outras e mantêm os valores selecionados.
- Nulos ficam no fim nas duas direções; o ID desempata. `result_version` muda quando o
  conjunto filtrado muda (invalida seleção de “todos os resultados”).
- Coluna inexistente **ou sem permissão** responde 422 `unknown_column` em filtro, ordenação
  e exportação; limite malformado responde 422 `invalid_filter`.
- `POST /api/v1/tables/{tabela}/export`: CSV UTF-8 com `;`, autorização reaplicada, texto que
  começa com `= + - @` neutralizado com apóstrofo. Identificador mínimo sempre incluído.
- Tabelas: `opportunities` (da organização) e, do dossiê, `documents` e `claims`. As do
  dossiê exigem `scope_id` (ID da oportunidade) dentro de `TableQuery`; sem ele a resposta é
  422 `scope_required`, e oportunidade de outra organização responde 404.
- `TableRow.refs` traz identificadores relacionados usados por ações da linha (ex.:
  `document_id` na tabela de versões); `TableColumnOut.default_width` sugere a largura inicial.
- Visões (`/tables/{tabela}/views`, `/table-views/{id}`) são pessoais; a configuração é
  higienizada ao gravar e ao ler.

## Demonstrativos

- Fórmula `econ-1.1.0`: cada cenário traz `steps` (`sign` `+`, `-` ou `info`) que somam ao
  resultado líquido. Execuções `econ-1.0.0` não têm `steps`.
- `GET /api/v1/calculations/{id}/export`: CSV do resultado gravado, sem recálculo; campo
  contratual nulo sai como “não definido”, nunca zero.

## Códigos de erro da originação

`origination_not_configured` (503) · `origination_unavailable` (503, repetível) ·
`origination_rate_limited` (429) · `origination_auth_failed` (502) ·
`origination_forbidden` (502) · `origination_contract_violation` (502) ·
`origination_not_found` (404). Nenhum deles é convertido em lista vazia.

## Motores e contraditório (RF04–RF06)

Execução e achado são servidos pelas rotas de motores (T008) e foram conferidos contra o
Nulidade360 em modo simulado; cenário e comparação ainda não têm rota. Regras em
`backend/evidia/domain/engines.py`, testadas em `backend/tests/test_engine_contracts.py`.

- **Execução (`engine_run`)**: `queued | running | partial | completed | failed | cancelled`.
  Bloco `failed` ou `skipped` impede `completed`, mesmo que o motor rotule a execução como
  concluída; o rótulo original fica em `engine_status`. Estado desconhecido do motor é violação
  de contrato, não sucesso.
- **Lado simulado**: `simulated_side` e `side_confirmed_by` são obrigatórios; não há padrão.
- **Custo**: `cost_amount` nulo significa desconhecido. Zero só quando informado, com moeda.
- **Achado (`finding`)**: sem citação carrega a pendência `evidence_pending`; com qualquer
  pendência não pode estar `validated`. `risk_index` é índice de risco do motor, não estimativa
  de êxito. A saída original do motor fica em `original`.
- **Citação**: versão de documento do dossiê e página existente no arquivo; fora disso,
  `citation_unresolved` ou `page_out_of_range`.
- **Argumento de cenário**: sem evidência fica `hypothesis_for_validation`; `origin` separa
  evidência de origem (`source_evidence`) de construção do cenário (`scenario_inference`).
- **Comparação (`scenario_comparison`)**: lado sem execução é `not_analyzed`, sem contagem
  nem risco substituto; `comparable` só com os dois lados concluídos sobre a versão atual do
  dossiê. A comparação não recebe a posição econômica.

## Rotas de motores (T008)

- `POST /api/v1/opportunities/{id}/engine-runs` — `{engine, document_version_id,
  simulated_side}`; 201 cria, 200 devolve a execução equivalente já existente (mesmo
  documento, lado e versão do dossiê). Erros: 422 `engine_requires_paid_run` (arquivo que
  não é texto em modo simulado), 409 `document_version_not_current`, 503
  `nulidade360_not_configured` / `nulidade360_unavailable`, 504 `nulidade360_timeout`,
  502 `nulidade360_contract_violation` / `nulidade360_rejected`.
- `GET /api/v1/opportunities/{id}/engine-runs` — execuções do dossiê.
- `POST /api/v1/engine-runs/{id}/refresh` — consulta o motor e reconcilia; não reenvia
  documento, não reinicia análise e não duplica achados.
- `GET /api/v1/engine-runs/{id}/findings` — achados normalizados, com `original`,
  `validation_blockers` e `reviews`.
- `POST /api/v1/engine-findings/{id}/reviews` — `{review_state?, citation?, comment}`;
  papel de revisor. 409 `validation_blocked` lista os impedimentos (`evidence_pending`,
  `citation_unresolved`, `page_out_of_range`, `mock_run`, `stale_run`); 422
  `review_reason_required` ao validar ou descartar sem fundamento; 422 `invalid_citation`.
  Citação do revisor entra com `source: "review"`; `original` nunca muda.

## Ainda sem contrato materializado

Diligência de vínculos (RF07–RF12, AC09–AC12) e a normalização específica das saídas do P4
(campos divergentes descritos em `../research.md`), que será escrita com o adaptador (T009).
