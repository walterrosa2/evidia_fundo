# Incremento 16 — ajuda contextual da operação (2026-11-18)

Só texto de ajuda e o balão que o exibe; nenhuma regra de negócio mudou. Sem commit.

| Entrega | Onde |
|---|---|
| Ajuda das 98 colunas das tabelas comuns | `backend/evidia/services/table_help.py` |
| Ajuda de seções, etapas, abas, botões e campos (38 tópicos) | `src/lib/operacao/help.ts` |
| Componentes `Help` e `WithHelp` | `src/components/operacao/primitives.tsx` |
| Balão em três partes, com rótulo em destaque | `src/components/shared/HelpHint.tsx` |
| Testes de formato | `backend/tests/test_tables.py`, `src/lib/operacao/help.test.ts` |

Formatos: campo e coluna — “o que é / como é calculado / como ler”; tela e aba — “o que é /
como funciona / como ler”; botão — “o que faz / quando usar / o que muda”.

Como validar: com o ambiente no ar, abrir um dossiê e passar o mouse ou o foco nos “?” ao lado
dos títulos de seção, dos cabeçalhos de coluna e dos botões principais. O balão abre acima do
conteúdo, dentro da janela, e fecha com Esc.

Limites: os textos seguem as regras da nova versão, mas não foram revisados por usuário final;
as telas da demonstração V3 não foram alteradas.

---

# Incremento 14 — integrações sem custo e fechamento (2026-11-17)

Só dados sintéticos e motores simulados; nenhuma API paga, nada commitado, nada homologado.
Evidências: `artifacts/qa/2026-11-17_incremento-14.md`.

| Entrega | Onde |
|---|---|
| Mapa de evidências e relatório do Nulidade360 | `backend/evidia/adapters/nulidade360.py` (`send_evidence_map`, `fetch_report`), `services/engines.py`, `EnginesSection.tsx` |
| Pedido de execução do P4 e texto de entrada | `backend/evidia/adapters/p4.py` (`build_input_package`), `services/p4.py`, `src/components/operacao/P4Requests.tsx` |
| Resultado de fonte real por planilha | `backend/evidia/adapters/diligence.py` (`parse_result_file`), `services/diligence.py`, `DiligenceFileImport.tsx` |
| Política de colunas por papel | `backend/evidia/services/tables.py` (`DEFAULT_COLUMN_POLICY`, `configure_column_policy`) |
| Segregação opcional do memorando | `backend/evidia/routers/operations.py` (`decide_memo`), `config.py` |
| Medição de volume | `backend/scripts/table_volume.py` |
| Homologação somente-leitura da origem | `backend/scripts/origination_check.py` |
| Protocolo do piloto | `docs/desenvolvimento/PILOTO.md` |

Como validar na tela, com um dossiê aberto e o motor simulado no ar:

1. **P4.** Em “Pedidos de Execução”, escolher um documento com texto e o lado, “Preparar
   Execução”, baixar o texto de entrada (começa com `<pagina> 1`). Importar o relatório pelo
   próprio pedido fecha o pedido.
2. **Nulidade360.** Ao iniciar a auditoria, o campo “Mapa de evidências (opcional)” lista as
   planilhas do dossiê. “Baixar Relatório do Motor” baixa o .docx ou explica que o motor só o
   gera com achados aceitos nele.
3. **Diligência.** Em “Abrir Diligência”, “Registrar Consulta Feita em Fonte Real”: escolher o
   profissional e a planilha, informar a fonte e a cobertura.
4. **Leitor.** Um usuário com papel de leitura não vê as colunas “ID na Origem”, “Hash
   (SHA-256)” e “Arquivo”.

Limites: nenhum motor rodou de verdade; a homologação da originação e o piloto dependem de
acesso e autorização (ver `docs/desenvolvimento/PILOTO.md`). As políticas de colunas e de
aprovação são padrões assumidos, não decisões do usuário.

---

# Incrementos 7 a 13 — do texto dos documentos à decisão (2026-11-17)

Tudo com dados sintéticos e motores simulados: nenhuma API paga foi consumida, nada foi
commitado e nada aqui é homologação. Evidências: `artifacts/qa/2026-11-17_incrementos-7-13.md`.

## O que foi feito e onde

| Incr. | Entrega | Onde |
|---|---|---|
| 7 | Texto por página, OCR local (Tesseract), fila de tarefas e trabalhador, sugestão de afirmações por regras e por modelo | `backend/evidia/domain/{texts,ocr,extraction}.py`, `services/{documents,jobs}.py`, `worker.py`, `llm.py`, `src/components/operacao/DocumentDetail.tsx` |
| 8 | Participantes, papéis, cruzamentos, pesquisa em fonte e ocorrências | `backend/evidia/domain/diligence.py`, `services/diligence.py`, `adapters/diligence.py`, `DiligenceSection.tsx` |
| 9 | Pedidos, cenários por lado e participante, comparação | `backend/evidia/services/scenarios.py`, `routers/scenarios.py`, `ScenariosSection.tsx` |
| 10 | Importação do relatório do P4; achados e itens na tabela comum | `backend/evidia/adapters/p4.py`, `services/p4.py`, `P4Section.tsx` |
| 11 | Impactos com grupo de dependência, sensibilidade, responsável e confiança, limitações | `backend/evidia/domain/economics.py`, `services/economics.py`, `EconomicsForm.tsx`, `EconomicsSection.tsx` |
| 11–12 | Memorando versionado e decisão do responsável | `services/economics.py` (`create_memo`), `routers/operations.py`, `DecisionSection.tsx` |
| 12 | Seis etapas com estado do servidor; URLs antigas | `backend/evidia/services/stages.py`, `StageNav.tsx`, `src/lib/operacao/stages.ts`, `src/routes/__root.tsx` |
| 12 | Tabela comum: arrasto, dinheiro, lacunas, cenários, ação em massa | `backend/evidia/services/tables.py`, `DataTable.tsx`, `ClaimsSection.tsx` |
| 12 | Vínculo achado–afirmação | `backend/evidia/services/engines.py` (`link_claim`), `EnginesSection.tsx` |
| 13 | Relatórios derivados da originação | `backend/evidia/adapters/origination.py` (`fetch_document`), `services/importing.py` |
| 13 | Imagem Docker do backend | `backend/Dockerfile`, `backend/docker-entrypoint.sh`, `docker-compose.operacao.yml` |

Migrações: `0005` a `0011` em `backend/migrations/versions/`.

## Como executar

```powershell
# Local (API 8007, frontend 5180)
.\_start.ps1                       # -NoBrowser para não abrir o navegador

# Com o motor simulado (sem custo), em outro terminal
.\backend\scripts\start_nulidade360_mock.ps1 -Nulidade360Home "<pasta do Nulidade360>"
$env:EVIDIA_NULIDADE360_MODE = "mock"
$env:EVIDIA_NULIDADE360_BASE_URL = "http://127.0.0.1:8530"
$env:EVIDIA_DILIGENCE_MODE = "fixture"
.\_start.ps1 -NoBrowser

# Encerrar tudo
.\backend\scripts\stop_local.ps1 -IncludeNulidade360

# API em container (homologação local; motores e modelo desligados)
$env:EVIDIA_ADMIN_PASSWORD = "<senha>"
docker compose -f docker-compose.operacao.yml up --build
```

## Como validar

```powershell
cd backend; $env:PYTHONPATH = "."
.\.venv\Scripts\python.exe -m pytest                 # 223 testes
.\.venv\Scripts\python.exe scripts\smoke_e2e.py
.\.venv\Scripts\python.exe scripts\ui_journey.py      # com os serviços no ar; 128 checagens
cd ..; npm test; npx tsc --noEmit; npm run build
```

Na tela, com um dossiê aberto em `/operacao/<id>`:

1. **Etapas.** A barra no topo mostra as seis etapas com o estado de cada uma. Abrir a etapa 5
   deixa só os demonstrativos; o endereço ganha `?etapa=5` e recarregar mantém a etapa.
2. **Impactos.** Em “Novo Demonstrativo”, informar 1.000.000 e dois impactos de valor com a
   mesma causa (−100.000 e −60.000): o líquido é 900.000. A memória mostra um como aplicado e o
   outro como não aplicado, com o motivo, além da sensibilidade.
3. **Memorando.** “Emitir Memorando” no demonstrativo vigente; na etapa 6, aprovar exige
   fundamento e a versão não aceita segunda decisão.
4. **Tabela comum.** Em “Colunas”, arrastar uma coluna pela alça; nas afirmações, selecionar
   pendentes e “Enviar Selecionadas para Revisão”.
5. **Relatórios da originação.** “Importar Relatórios da Originação”: entram como relatório
   derivado e o aviso de parecer integral indisponível continua.

## Limites desta entrega

- Metodologia econômica não homologada; contrato não definido. O memorando aprovado registra
  autoria, não homologação.
- Motores só simulados: nenhum achado de motor pode ser validado hoje, então impacto ligado a
  achado só foi provado em teste. Afirmação e ocorrência validadas funcionam como fonte.
- Originação e fonte de diligência reais não foram usadas.
- A tabela comum resolve a consulta em memória: adequado ao volume de teste, não medido em
  volume alto.
- Sem `?oportunidade`, as URLs antigas continuam abrindo a demonstração.
- A imagem Docker não é configuração de produção.

---

# Incremento 6 — revisão de achados do motor (2026-11-17)

Mesmas ressalvas do incremento 5: o motor só roda em modo de teste, nenhuma API paga foi
consumida, nada foi commitado. Evidências: `artifacts/qa/2026-11-17_incremento-6.md`.

| Entrega | Onde |
|---|---|
| Regra do que impede validar um achado | `backend/evidia/domain/engines.py` (`finding_validation_blockers`) |
| Revisão com histórico, fundamento e citação do revisor | `backend/evidia/services/engines.py` (`review_finding`), `backend/evidia/routers/engines.py` |
| Tabela `engine_finding_reviews` | `backend/evidia/models.py`, `backend/migrations/versions/0004_revisoes_de_achado.py` |
| Formulário, impedimentos e histórico em cada achado | `src/components/operacao/EnginesSection.tsx`, `src/lib/operacao/engines.ts` |

Como validar na tela: com o motor simulado no ar, abrir **Ver Achados** de uma execução,
escolher “Validada” e registrar — a tela lista os impedimentos (modo simulado, sem evidência).
Escolher “Descartada” sem fundamento é recusado; com fundamento, o histórico mostra
“Pendente → Descartada”.

Limites: como só há execuções simuladas, nenhum achado pode ser validado hoje; o caminho de
validação foi provado nos testes do servidor com um substituto do motor. Achados ainda não se
ligam a afirmações nem a valores.

---

# Incremento 5 — Nulidade360 em modo simulado (2026-11-17)

O motor rodou **somente em modo de teste**, com texto sintético: nenhum achado desta entrega é
análise de documento e nenhuma API paga foi consumida. Sem commit, push ou deploy.
Evidências: `artifacts/qa/2026-11-17_incremento-5.md`.

## O que foi feito e onde

| Entrega | Onde |
|---|---|
| Cliente HTTP do motor e normalização da saída, sem ocultar o original | `backend/evidia/adapters/nulidade360.py` |
| Início, idempotência e reconciliação da execução | `backend/evidia/services/engines.py` |
| Rotas de execução e achados | `backend/evidia/routers/engines.py` |
| Tabelas `engine_runs` e `engine_findings` | `backend/evidia/models.py`, `backend/migrations/versions/0003_execucoes_de_motor.py` |
| Execução desatualizada quando o dossiê muda | `backend/evidia/services/dossier.py` |
| Seção do motor no dossiê e achados em tela inteira | `src/components/operacao/EnginesSection.tsx`, `src/lib/operacao/engines.ts` |
| Motor simulado em pasta isolada; verificação contra ele | `backend/scripts/start_nulidade360_mock.ps1`, `backend/scripts/nulidade360_check.py` |
| Guia de execução | `docs/desenvolvimento/NULIDADE360_LOCAL.md` |

## Como validar

Seguir `docs/desenvolvimento/NULIDADE360_LOCAL.md`. Na tela, em um dossiê: enviar um arquivo
`.txt`, ir a **Auditoria de Nulidades (Nulidade360)**, escolher o documento, confirmar o lado
e iniciar. A execução passa a “Concluída”, rotulada “Modo simulado”; **Ver Achados** abre a
lista em tela inteira, com cada achado marcado como pendente de evidência.

Sem a integração ligada (padrão), iniciar a auditoria mostra erro de configuração.

## Limites desta entrega

- Só modo simulado: PDF é recusado, e a análise real não está habilitada.
- O motor não informa custo nem uso; o custo aparece como “Não informado pelo motor”.
- A reconciliação acontece enquanto a tela do dossiê está aberta, ou ao pedir “Consultar o
  Motor”; não há trabalhador em segundo plano.
- Achados ainda não podem ser revisados na tela nem vinculados a afirmações e valores.

---

# Incremento 4 — contratos de motor e textos do servidor (2026-11-17)

Sem tela nova. Dados **sintéticos**; nenhum motor real foi executado; sem commit, push ou
deploy. Evidências: `artifacts/qa/2026-11-17_incremento-4.md`.

| Entrega | Onde |
|---|---|
| Contratos de execução de motor, achado, cenário e comparação | `backend/evidia/schemas_engines.py` |
| Regras: estado da execução, pendências de citação, comparação dos dois lados | `backend/evidia/domain/engines.py` |
| Exemplos sintéticos e exportação em JSON Schema | `backend/evidia/fixtures/engines.py`, `backend/scripts/export_contracts.py`, `specs/001-evidia-operacional/contracts/` |
| Testes dos aceites AC05–AC08 no nível de contrato | `backend/tests/test_engine_contracts.py` |
| Mensagens do servidor acentuadas e concordância de “não encontrado/encontrada” | `backend/evidia/` (vários), `backend/evidia/errors.py` |

Como validar: `cd backend; $env:PYTHONPATH = "."; .\.venv\Scripts\python.exe -m pytest tests\test_engine_contracts.py`.

Limites: os contratos ainda não são servidos por nenhuma rota e não foram conferidos com
saída real de motor; as descrições das lacunas da importação seguem sem acento (entram no
hash do snapshot).

---

# Incremento 3 — tabela comum no dossiê (2026-11-17)

Mesmo ambiente local e mesmas ressalvas: dados **sintéticos**, sem commit, push ou deploy,
**metodologia econômica não homologada**. Evidências: `artifacts/qa/2026-11-17_incremento-3.md`.

## O que foi feito e onde

| Entrega | Onde |
|---|---|
| Tabelas `documents` (uma linha por versão) e `claims`, restritas à oportunidade | `backend/evidia/services/tables.py` |
| `scope_id` na consulta, largura sugerida da coluna e referências da linha | `backend/evidia/schemas.py`, `src/lib/operacao/types.ts` |
| Tabela comum com escopo e coluna de ações por linha | `src/components/operacao/DataTable.tsx` |
| Documentos e afirmações do dossiê na tabela comum | `src/components/operacao/DocumentsSection.tsx`, `ClaimsSection.tsx` |
| Consulta das duas tabelas na URL do dossiê (`docs`, `afirm`) | `src/routes/operacao.$id.tsx` |
| Testes do servidor e roteiro de interface | `backend/tests/test_tables.py`, `backend/scripts/ui_journey.py` |

## Como validar

Comandos iguais aos dos incrementos anteriores (abaixo). Na tela, abra um dossiê:

- em **Documentos do Dossiê**, envie uma nova versão de um documento: a versão anterior
  continua na tabela como “Anterior”; filtre **Vigência** por “Atual”;
- em **Afirmações e Revisão**, filtre **Atualidade** por “Desatualizada” para ver as
  afirmações que citam a versão substituída; abra a ficha e volte — os filtros permanecem;
- **Exportar** gera o CSV apenas do dossiê aberto.

## Limites desta entrega

- Reordenar colunas ainda é por botões; a única ação em massa é exportar.
- Lacunas documentais e execuções anteriores de cálculo seguem em lista simples.
- Nenhuma coluna real é restrita por papel (depende de D5).
- Visão salva vale para a tabela em todos os dossiês, não para um dossiê específico.

---

# Incremento 2 — tabela comum e demonstrativos na tela (2026-11-16)

Continuação do incremento 1, no mesmo ambiente local e com as mesmas ressalvas: dados
**sintéticos**, sem commit, push ou deploy, e **metodologia econômica não homologada**.
Evidências: `artifacts/qa/2026-11-16_incremento-2.md`.

## O que foi feito e onde

| Entrega | Onde |
|---|---|
| Consulta de tabela no servidor: filtros, facetas, ordenação, paginação, exportação | `backend/evidia/services/tables.py`, `backend/evidia/routers/tables.py` |
| Visões salvas por usuário e migração | `backend/evidia/models.py` (`TableView`), `backend/migrations/versions/0002_visoes_de_tabela.py` |
| CSV seguro (fórmulas neutralizadas) | `backend/evidia/domain/csvsafe.py` |
| Memória de cálculo por cenário e exportação do demonstrativo | `backend/evidia/domain/economics.py`, `backend/evidia/routers/operations.py` |
| Componente comum de tabela e painel flutuante em portal | `src/components/operacao/DataTable.tsx`, `AnchoredPopover.tsx` |
| Estado da tabela, dinheiro e formulário como funções puras | `src/lib/operacao/tableState.ts`, `money.ts`, `economicsForm.ts` |
| Lista de oportunidades com a tabela comum (estado na URL) | `src/routes/operacao.index.tsx` |
| Demonstrativos no dossiê: premissas, resumo e memória em tela inteira | `src/components/operacao/EconomicsSection.tsx`, `EconomicsForm.tsx`, `src/routes/operacao.$id.tsx` |
| Envio simulado da demo fora das rotas operacionais | `src/routes/__root.tsx` |

## Como validar

Os comandos são os do incremento 1 (abaixo). O `_start.ps1` aplica a migração nova; para
aplicar à mão: `cd backend; .\.venv\Scripts\python.exe -m alembic upgrade head`.

Na tela, em `/operacao`:

- clique no funil de uma coluna para filtrar, no rótulo para ordenar e na borda do cabeçalho
  para ajustar a largura; **Colunas** exibe, oculta e reordena; **Visões** salva a configuração;
  **Exportar** gera o CSV do resultado filtrado ou dos selecionados;
- abra um dossiê, vá a **Demonstrativos Econômicos**, informe exposição de R$ 1.000.000,00,
  desembolso de R$ 700.000 e um custo de R$ 50.000: a redução líquida é R$ 250.000,00;
  clique no valor para abrir a memória de cálculo (tela inteira, “← Voltar”).

## Limites desta entrega

- Tabela comum só na lista de oportunidades; as tabelas do dossiê continuam simples (atendido no incremento 3).
- A memória não tem sensibilidade, vínculo com achados nem responsável por componente — e
  declara isso na própria tela. Preço, retorno e remuneração seguem “Não definido”.
- Nenhuma coluna real é restrita por papel: o mecanismo existe e é testado; a política depende de D5.
- Mensagens de erro do servidor fora do motor econômico ainda estão sem acentuação.

---

# Incremento 1 — primeira jornada operacional (2026-11-16)

Entrada → snapshot → dossiê → revisão, com backend real e testes. Ambiente local; sem commit,
push ou deploy. Dados usados são **sintéticos e rotulados**. Não é produção pronta: não há
integração homologada com a originação nem com os motores, e a metodologia econômica não foi
aprovada. Evidências: `artifacts/qa/2026-11-16_incremento-1.md`.

## O que foi feito e onde

| Entrega | Onde |
|---|---|
| Inventário dos quatro projetos e baseline | `specs/001-evidia-operacional/research.md` |
| Decisões de arquitetura e Constitution Check | `specs/001-evidia-operacional/adr/decisoes.md` |
| Contratos versionados e fixtures sintéticas | `specs/001-evidia-operacional/contracts/` |
| API FastAPI: sessão, isolamento por organização, auditoria | `backend/evidia/main.py`, `deps.py`, `routers/`, `logging_setup.py` |
| Adaptador somente-leitura da originação (HTTP + fixture) | `backend/evidia/adapters/origination.py` |
| Importação idempotente, snapshots versionados, conflitos, rascunho sem CNJ | `backend/evidia/services/importing.py`, `domain/cnj.py` |
| Documentos: hash, versão, páginas reais, duplicado, corrompido, desatualização | `backend/evidia/services/dossier.py`, `domain/documents.py` |
| Afirmações com natureza, citação e revisão com histórico | `backend/evidia/services/dossier.py` |
| Motor econômico em decimal: autor e réu separados, sem contrato | `backend/evidia/domain/economics.py` |
| Modelo de dados e migração inicial | `backend/evidia/models.py`, `backend/migrations/versions/0001_*.py` |
| Telas operacionais (lista, entrada, dossiê, ficha em tela inteira) | `src/routes/operacao*.tsx`, `src/components/operacao/`, `src/lib/operacao/` |
| Navegação: grupos “Operação” e “Demonstração”, rodapé por ambiente | `src/components/layout/Sidebar.tsx` |
| Inicializadores com healthcheck e `-NoBrowser` | `_start.ps1`, `_start.bat` |

## Como executar

```powershell
.\_start.ps1              # API (8007) + frontend (5180); abre /operacao após o healthcheck
.\_start.ps1 -NoBrowser   # sem abrir navegador
.\_start.ps1 -FrontendOnly   # só a demonstração
.\_start.ps1 -BackendOnly    # só a API (abre /docs)
```

Na primeira execução o script cria `backend\.venv`, instala dependências, aplica as migrações
e cria `backend\.env` a partir do exemplo. O usuário inicial é `admin`; a senha fica em
`backend\.env` (`EVIDIA_ADMIN_PASSWORD`) e no Painel de Soluções — em nenhum arquivo versionado.
Use sempre `http://localhost:5180` (não `127.0.0.1`): o cookie de sessão exige o mesmo host da API.

`EVIDIA_ORIGINATION_MODE` em `backend\.env`: `fixture` (padrão local, dados sintéticos),
`disabled` (erro de configuração explícito) ou `http` (originação real — ainda não homologado).

## Como validar

```powershell
cd backend
$env:PYTHONPATH = "."
.\.venv\Scripts\python.exe -m pytest                 # 82 testes
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe scripts\smoke_e2e.py      # ponta a ponta, com os serviços no ar
.\.venv\Scripts\python.exe scripts\ui_journey.py     # jornada no Edge (requer playwright)
.\.venv\Scripts\python.exe scripts\export_contracts.py   # regenerar contratos
cd ..
npm test            # vitest (cliente da API)
npx tsc --noEmit
npm run build
npm run lint        # falha preexistente em vite.config.ts; ver relatório de QA
```

Na tela: entrar em `/operacao` → **Nova Entrada** → selecionar um processo sintético →
confirmar posição e parte → **Importar Oportunidade** → no dossiê, enviar um PDF, registrar
uma afirmação com página e abrir a **ficha** (tela inteira, “← Voltar”).

## Limites desta entrega

- Originação: contrato verificado por leitura de código e resposta simulada; **nenhuma chamada
  à instância real** (D3). Nulidade360 e P4: apenas inventariados.
- Sem OCR, sem extração automática de afirmações, sem cenários do contraditório, sem diligência.
- Motor econômico tem API e testes, mas **não tem tela** (entregue no incremento 2) e não está homologado (D7).
- Tabelas: cabeçalho fixo e rolagem; sem colunas configuráveis, filtros ou seleção (T015; lista de oportunidades atendida no incremento 2).
- Autenticação local com um administrador; sem gestão de usuários (D5). SQLite local (D6).
- Os roteiros de verificação deixaram oportunidades **sintéticas** em `backend/data/evidia.db`.

---
# Entrega documental — ciclo operacional (2026-11-16)

Constituição 1.0.0 e especificação 0.3. Nenhum código de aplicação alterado.
Consulte `PRD.md`, `specs/001-evidia-operacional/` e `docs/desenvolvimento/PROMPT_CLAUDE_CODE.md`.
Para retomar, abra Claude Code na raiz e envie o prompt. Ele começa pelo inventário/contratos
e só executa tarefas liberadas. Não há novo serviço para iniciar nesta entrega.
Validação documental: consistência de IDs, princípios, links locais, versões e preservação do
histórico; não substitui QA de aplicação. Pendências: piloto, metodologia, acesso e infraestrutura.
`.specify` permanece ignorado; não fazer commit sem revisar a política e os dados.

---

## Histórico da demo V3 — resultados reportados, não reexecutados neste ciclo

# Walkthrough — EvidIA Investor Suite V3

**Data:** 12/08/2026 · **Ciclo:** Spec-Kit SDDC · **Escopo:** 57 itens em 10 épicos, todos concluídos

---

## 1. Como executar

```bash
npm install          # ou bun install
npm run dev          # http://localhost:3000
npm run lint         # 0 erros (6 warnings preexistentes em components/ui)
npx tsc --noEmit     # limpo
npm run build        # limpo
```

Regeneração dos dados a partir dos documentos de origem (requer o HD com os arquivos):

```bash
py -3 scripts/extrair_nulidade.py .              # extrai os 59 achados dos pareceres .docx
py -3 scripts/gerar_nulidade_ts.py . src/data/v2/nullityReports.ts
py -3 scripts/gerar_evidencias_ts.py src/data/v2/evidenceDossier.ts
py -3 scripts/minerar_timeline.py .              # minera eventos datados dos autos
py -3 scripts/parse_movimentacoes.py             # lê a capa de movimentações do PJe
```

---

## 2. O que mudou, por épico

### E0 — Integridade de dados e bugs

| Item | Onde validar |
|---|---|
| Red Team exibia 3500% e 2000% | `/red-team` com ELETROMAR: agora 35%, 20% e 42% |
| Valuation do ELETROMAR caía vazia | `/valuation` com ELETROMAR: 3 cenários e 4 ajustes |
| Valor da causa R$ 1.850.000 → **R$ 876.383,30** | `/deals` coluna "Valor da causa" |
| Tribunal "TJMA" → **TJMT**; vara "1ª" → **40ª** | cabeçalho de `/deals/case-eletromar-totvs` |
| Datas da timeline inventadas | cronologia do caso: distribuição 18/04/2017, laudo 20/04/2022 |
| Score 28,5 → **46,73** (parecer) | anel de score no detalhe do caso |
| "Achados mapeados: 2737" → **20 achados** + 2.737 evidências | `/nulidade360`, cartão "Achados aceitos" |

Dois achados de atribuição de fonte corrigidos: as "8.000 horas" eram fala de representante da JK
em degravação (não conclusão pericial), e a evidência da negativação citava a página 9681 de um
documento com 2.779 páginas — substituída pelos e-mails da TOTVS negociando a retirada do Serasa.

### E4 + E7 — Motor financeiro

- `src/lib/judicialUpdate.ts` — correção monetária, juros simples/compostos, pro rata die, multa,
  honorários e transição automática do regime da Lei 14.905/2024 em 30/08/2024.
- `src/config/monetaryIndices.ts` — séries de IPCA, IPCA-E, INPC, IGP-M, SELIC e Tabela TJSP,
  com marcação de competências projetadas.
- `/calculo-judicial` — memória de cálculo com parâmetros, composição, gráfico de evolução e
  demonstrativo mês a mês (159 linhas no ELETROMAR).
- Valor Econômico Potencial passou a derivar do motor; data-base corrigida para a distribuição.

| Caso | VEP antes | VEP depois |
|---|---|---|
| ELETROMAR | R$ 21,3 mi (fator 11,5×) | **R$ 4,5 mi** (5,13×) |
| FEB × SAP | R$ 3,76 mi (5,5×) | **R$ 1,82 mi** (2,66×) |
| Gritti × Matsuda | R$ 560 mil (8,8×) | **R$ 204 mil** (3,21×) |

### E3 — Hierarquia de criticidade

`src/lib/criticalityScore.ts` compõe de fato os quatro indicadores:
`40% nulidade + 30% (100−probatório) + 20% (100−jurídico) + 10% (100−acordo)`.
Faixas: <30 baixo · 30–55 moderado · 55–75 alto · ≥75 crítico.
Resultado: ELETROMAR **24,9** · FEB **45,6** · Gritti **60,6**.
O card mostra a contribuição de cada componente.

### E2 — Cronologia processual

De 18 para **53 eventos** (ELETROMAR 13 · FEB 11 · Gritti 29), com tipo de ato, autor, fase e
página de origem. `ProceduralTimeline` agrupa por ano, filtra por família de ato, alterna entre
marcos e cronologia completa, e deriva duration, tempo desde o último ato, maior hiato e
distribuição da iniciativa entre as partes.

### E8 — Nulidade360

`src/data/v2/nullityReports.ts` (1.710 linhas geradas) traz os **14 pilares** e os **59 achados**
dos três pareceres, cada um com fundamento jurídico, dever violado, ato afetado, inferência,
prejuízo, nexo causal, impacto, estratégia, ação recomendada, evidências e os selos de
classificação. `PillarHeatmap` distingue pilar afetado de não avaliado; `FindingSheet` organiza o
achado em vício → consequência → ação.

Corrigido: `mockFindings` derivava sempre do FEB, e `/nulidade360/resultado` tinha score fixo em 52
com composição inventada.

### E9 — Red Team

`src/data/v2/evidenceDossier.ts` importa **68 provas**, **43 quesitos** e **43 respostas** simuladas
da ré. A tela passou a ter quatro abas — Ataques, Provas, Quesitos e respostas, Síntese — com
filtro por natureza da prova, busca textual, selo de status técnico e taxa de conformidade
(19 conformes, 15 não conformes, 3 parciais, 6 inconclusivos).

### E1 — Linguagem

`src/config/editorialGuide.ts` fixa as regras. Removidas a segunda pessoa ("seu portfólio"),
as instruções de navegação dentro de texto analítico e o tom de produto. Campos de ajuda
padronizados em "o que é / como é calculado / como ler". Resumos executivos reescritos na
estrutura tese → base probatória → fragilidades → assimetria → recomendação.

Corrigido um aviso factualmente errado: a barra lateral dizia "dados fictícios", quando os casos
vêm de documentos processuais públicos — apenas as métricas são simuladas.

### E6 — Navegação recolhível

`SidebarProvider` com persistência e atalho **Ctrl/Cmd + B**; 256px ↔ 64px, ícones com tooltip.

### Ajuda contextual (pós-ciclo)

**Correção do balão recortado.** O `HelpHint` usava `position: absolute` no fluxo, e por isso era
cortado por qualquer ancestral com `overflow: hidden` ou `overflow-x: auto` — o caso reportado no
"Valor atualizado" do Deal Flow, e também nas tabelas da memória de cálculo e nos cartões de canto
arredondado. Agora o balão é renderizado num **portal no `document.body`**, com posição fixa
calculada a partir do botão, inversão automática de lado quando falta espaço vertical, contenção
horizontal na viewport, seta apontando para o gatilho, fechamento por `Escape` e reposicionamento
em scroll e resize. `z-index: 100` fica acima de todos os elementos fixos da aplicação (o maior
era 50).

**Cobertura.** De 13 para **106 botões de ajuda** distribuídos em 12 telas. Os textos ficam em
`src/config/fieldHelp.ts`, para que o mesmo campo tenha a mesma explicação em qualquer tela.
Componentes ganharam suporte a `help`: `MetricCard`, o novo `Th` (cabeçalho de tabela), além dos
campos locais de cada tela (`Stat`, `KV`, `Metric`, `Param`, `Seal`, `Field`, `ScenarioLine`).

| Tela | Botões |
|---|---|
| Detalhe do caso | 24 |
| Valuation | 17 |
| Dashboard · Cálculo judicial | 12 cada |
| Deal Flow | 10 |
| Nulidade360 | 9 |
| Blocos · Red Team | 5 cada |
| Investment Memo | 4 |
| Evidências · Configurações | 3 cada |
| Resultado do parecer | 2 no topo, mais os selos de cada achado ao expandir |

A tela `/pipeline` não recebeu botões: é a página explicativa da plataforma, integralmente
composta por texto descritivo.

### E5 — Modo edição

`DemoEditProvider` aplica uma camada de override na leitura, preservando o mock imutável.
Painel em **Configurações** com toggle, contador, exportar, importar e restaurar originais.
Padrão desligado — verificado nas 15 rotas: nenhuma affordance de edição vaza.

---

## 3. Evidências de validação

```
typecheck   : limpo
lint        : 0 erros · 6 warnings (preexistentes em components/ui)
build       : limpo
rotas       : 15/15 respondem HTTP 200
modo edição : 0 affordances com o flag desligado nas 15 rotas
motor       : bordas testadas — período zero, juros a partir da citação,
              multa e honorários, data invertida, transição de regime
```

Conferência dos dados importados contra os arquivos de origem:

| Fonte | Esperado | Importado |
|---|---|---|
| Pareceres Nulidade360 | 20 + 20 + 19 achados | 59 ✓ |
| Scores globais | 46,73 · 51,88 · 80,80 | idem ✓ |
| relatorio_final.xlsx — provas | 68 | 68 ✓ |
| relatorio_final.xlsx — quesitos | 43 | 43 ✓ |
| Status técnico | 19 / 15 / 3 / 6 | idem ✓ |
| Tipos de prova | 26/18/7/6/6/3/2 | idem ✓ |

---

## 4. Riscos e limitações

1. **Séries de índices aproximadas.** Calibradas pela variação anual oficial e distribuídas
   mensalmente pela taxa equivalente. Servem para dimensionar exposure; não substituem a tabela
   oficial do tribunal para uso processual. Competências futuras são sinalizadas como projeção.
2. **Densidade desigual da cronologia.** O Gritti tem 29 eventos porque o OCR preserva a capa de
   movimentações do PJe; ELETROMAR e FEB não têm essa listagem, e a curadoria dependeu de
   mineração por contexto. É limitação da fonte.
3. **Dossiê de provas só existe para o ELETROMAR** — é o único caso com pipeline P4 executado.
   As abas Provas, Quesitos e Síntese não aparecem nos demais.
4. **Documentos de terceiros nos autos.** As páginas 480–520 do ELETROMAR contêm processos de
   outros clientes contra a TOTVS, juntados como prova de conduta reiterada. Foram tratados como
   evidência, não como movimentação deste processo — atenção ao reprocessar.
5. **`.prettierrc` ganhou `endOfLine: "auto"`.** Sem isso, `npm run lint` acusava ~19.500 erros de
   CRLF neste ambiente Windows (`core.autocrlf=true` grava CRLF no disco, o repositório armazena
   LF). A mudança não afeta o que é commitado.

---

## 5. Próximos passos sugeridos

- Executar o pipeline P4 para FEB e Gritti, habilitando as abas de provas nesses casos.
- Substituir as séries de índices por consulta às tabelas oficiais, se o uso deixar de ser demonstrativo.
- Estender o modo edição à estrutura (adicionar e remover achados), se a demonstração exigir.
- Ligar o `sourcePage` da cronologia ao `CaseDocumentViewer` para abrir a página diretamente.
