# Orientação vigente — evolução operacional da Evidia

Atualizada em 2026-11-16. Leia `.specify/memory/constitution.md` (1.0.0), `PRD.md` e
`specs/001-evidia-operacional/spec.md`, `refinamento.md`, `plan.md`, `tasks.md` antes de desenvolver.
O prompt executável está em `docs/desenvolvimento/PROMPT_CLAUDE_CODE.md`.

As seções históricas abaixo descrevem a demo V3 e seus resultados reportados; não certificam
o estado atual nem proíbem backend no novo ciclo. Mock/localStorage são fontes apenas da demo.
Na operação, dados persistentes/autorização e contratos devem seguir o novo plano. Não alterar
o código agora por inferir que a documentação já comprova implementação.

D1: recebimento do autor e redução do passivo do réu separados; contrato depois.
D2: processos e registros profissionais primeiro; redes sociais complementares revisadas.
Sem fallback demo em falha operacional; sem contrato inventado, commit, push ou deploy automático.

`npm run lint` executa o script do package.json (atualmente eslint); não presumir que formata.
Verifique comandos/versões reais antes de executar. Leia handoff/sessions e preserve histórico.
As regras gerais de cálculo fora da UI, proveniência e fontes imutáveis permanecem aplicáveis.

## Operação — estado e comandos (incremento 17, 2026-11-18)

Backend em `backend/` (FastAPI, SQLite + Alembic, pacote `evidia`); telas em `src/routes/operacao*.tsx`,
`src/components/operacao/` e `src/lib/operacao/`. Portas: frontend 5180, API 8007.
`.\_start.ps1` sobe os dois (`-NoBrowser`, `-FrontendOnly`, `-BackendOnly`).

```powershell
cd backend; $env:PYTHONPATH = "."
.\.venv\Scripts\python.exe -m pytest            # testes do backend
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe scripts\export_contracts.py   # após mudar schemas
npm test                                        # vitest (raiz)
```

Regras: `backend/evidia/schemas.py` e `src/lib/operacao/types.ts` mudam juntos;
`specs/001-evidia-operacional/contracts/` é gerado; telas operacionais nunca importam `src/data`;
registros de fixture mantêm a marca de sintético. Contratos de motor e contraditório ficam em
`backend/evidia/schemas_engines.py`; execução e achado têm espelho em `types.ts`.
Nulidade360: só modo simulado (`EVIDIA_NULIDADE360_MODE=mock`, arquivos `.txt`/`.md`); ver
`docs/desenvolvimento/NULIDADE360_LOCAL.md`. Nunca importar módulos do Nulidade360 nem rodá-lo
na pasta dele; execução real (API paga) exige autorização específica do usuário.
Não mudar textos que entram no snapshot normalizado (lacunas da importação): alteram o hash. Estado das tarefas em
`specs/001-evidia-operacional/tasks.md`.

Tabela nova usa `DataTable` (`src/components/operacao/DataTable.tsx`) com colunas definidas em
`backend/evidia/services/tables.py`: filtro, ordenação, paginação e exportação são do servidor.
Tabela de dossiê é `scoped=True` e recebe `scopeId` (a oportunidade); ação de linha vai em
`rowActions`, nunca em tabela à parte.
Dinheiro trafega como texto decimal; a tela formata com `src/lib/operacao/money.ts` e nunca
calcula resultado econômico. Mudança de modelo pede migração Alembic nova (hoje em `0013`);
coluna obrigatória nova precisa de `server_default` (o banco local já tem linhas).
Coluna de dinheiro em tabela usa o tipo `money` (valor `Decimal` no servidor).

Etapas: o estado das seis etapas vem de `backend/evidia/services/stages.py`; a tela não o
deduz. Seção nova do dossiê entra em `src/routes/operacao.$id.tsx` sob `shows(<etapa>)`.
Economia: fórmula em `domain/economics.py` (`FORMULA_VERSION`); mudar o cálculo muda a versão.
Impacto ligado ao dossiê só aceita fonte validada; memorando emitido nunca é reescrito.
Jornada de navegador: `backend/scripts/ui_journey.py` (precisa dos serviços no ar, com o
Nulidade360 simulado e `EVIDIA_DILIGENCE_MODE=fixture`). Container: `docker-compose.operacao.yml`.
Colunas por papel: política em `services/tables.py` (`DEFAULT_COLUMN_POLICY`), ajustada por
`EVIDIA_COLUMN_POLICY`; coluna nova sensível entra nessa política, não na tela.
P4: a Evidia nunca o executa — registra o pedido, gera o texto de entrada e importa o relatório.
Piloto real: `docs/desenvolvimento/PILOTO.md`; T019 não é concluída com dado simulado.
IA real: `EVIDIA_LLM_MODE=gemini` e `EVIDIA_NULIDADE360_MODE=live` consomem API paga e só rodam
com autorização do usuário; a chave vai por variável de ambiente, nunca em arquivo. Prompts são
versionados em `backend/evidia/prompts/` (hoje `claim_extraction_v2`, `adversarial_v2`): mudar
o texto cria versão nova. Saída de modelo é sempre conferida no servidor contra a página.
Avaliação com IA real: `backend/scripts/analyst_eval.py` (caso sintético em `eval_data/`).
Originação: `EVIDIA_ORIGINATION_MODE` = `fixture` (sintético), `http` (API) ou `sqlite`
(leitura somente-leitura de `originacao-pipeline/coletor/originacao.sqlite`, dados reais; o
banco só tem CNJ, tribunal, situação, distribuição e lead — partes vêm dos autos). O `.env`
local usa `sqlite`. Smoke e jornada precisam de dados sintéticos: subir a API com
`$env:EVIDIA_ENV_OVERLAY = "qa-profile.env"` (o `.env` vence variáveis de ambiente comuns).
Nunca escrever no banco nem no projeto da originação.
Ajuda contextual: coluna de tabela em `backend/evidia/services/table_help.py`; seção, aba,
botão e campo em `src/lib/operacao/help.ts`, usados por `<Help topic>` e `<WithHelp topic>`.
Coluna ou tópico novo precisa da ajuda em três partes (há teste que cobra). O rótulo da ajuda
não repete o texto de um botão da tela.
---

## Registro histórico — demo V3 (preservado)

# CLAUDE.md — EvidIA Investor Suite

Plataforma de demonstração para análise de risco processual voltada a fundos de investimento em
ativos judiciais. Casos baseados em documentos processuais públicos reais; scores, probabilidades
e valuation são simulados.

## Stack

TanStack Start (React 19 + Vite) · TanStack Router (file-based em `src/routes/`) ·
Tailwind + shadcn/ui · Recharts · Cloudflare Workers. Sem backend: toda persistência é
`localStorage`.

## Comandos

```bash
npm run dev            # servidor de desenvolvimento
npm run lint           # eslint + prettier
npx tsc --noEmit       # verificação de tipos
npm run build          # build de produção
```

## Arquitetura de dados

`src/data/v2/mockRealCasesV2.ts` é a fonte única. Dela derivam `mockDeals`, `mockCaseDetail`,
`mockFindings`, `mockRedTeam` e `mockValuation`. Dois arquivos são **gerados** e não devem ser
editados à mão:

| Arquivo | Origem | Script |
|---|---|---|
| `src/data/v2/nullityReports.ts` | pareceres `nulidade360_*.docx` | `scripts/extrair_nulidade.py` + `scripts/gerar_nulidade_ts.py` |
| `src/data/v2/evidenceDossier.ts` | `relatorio_final.xlsx` (pipeline P4) | `scripts/gerar_evidencias_ts.py` |

## Regras do projeto

1. **Cálculo fora da UI.** Motores em `src/lib/` como funções puras: `judicialUpdate`,
   `criticalityScore`, `economicPotential`, `timelineAnalytics`. Componentes só renderizam.
2. **Rastreabilidade.** Todo número exibido declara origem — `source_fact`, `party_allegation`,
   `expert_statement`, `court_statement`, `demo_inference` ou `simulated_metric`.
3. **Fonte imutável.** O modo edição aplica overrides na leitura; nunca muta o mock.
4. **Sem estado global novo.** Context + `localStorage`; não introduzir Zustand/Redux.
5. **Linguagem.** Ver `src/config/editorialGuide.ts`: terceira pessoa, sem instrução de navegação
   em texto analítico, campos de ajuda no formato "o que é / como é calculado / como ler".
6. **Data de distribuição** vem sempre de `filingDate`, nunca do primeiro evento da timeline —
   que pode ser fato extrajudicial ou ação conexa anterior.

<!-- SPECKIT START -->

## Ciclo V3 — concluído em 12/08/2026

**57 de 57 itens, 10 épicos.** Artefatos em `.specify/memory/` (`specify.md`, `plan.md`,
`tasks.md`) e `Walkthrough.md` na raiz.

| Épico | Entrega |
|---|---|
| E0 | Integridade: escala de probabilidade, valuation ausente, valor da causa, tribunal, datas e scores conferidos com os autos |
| E7 + E4 | Motor de atualização de débitos com transição da Lei 14.905/2024, tela `/calculo-judicial` e VEP derivado do motor |
| E3 | Criticidade composta: 40% nulidade + 30% probatório + 20% jurídico + 10% acordo |
| E2 | Cronologia de 18 para 53 eventos, com tipo de ato, autor, fase, página e métricas de duration |
| E8 | Nulidade360 com 14 pilares e 59 achados, mapa de calor e ficha em vício → consequência → ação |
| E9 | Red Team em abas: 68 provas, 43 quesitos e respostas simuladas da ré, síntese de conformidade |
| E1 | Guia editorial e revisão de linguagem para o leitor de fundo |
| E6 | Navegação recolhível com Ctrl+B e persistência |
| E5 | Modo edição de demonstração, desligado por padrão, com overrides exportáveis |

### Decisões vigentes

- Índice de correção padrão: **Tabela Prática do TJSP**.
- Criticidade: composição dos quatro indicadores, cortes em 30 / 55 / 75.
- Modo edição: apenas valores e textos existentes, sem edição estrutural.
- Valor da causa do ELETROMAR: **R$ 876.383,30**.

<!-- SPECKIT END -->
