# Inventário e baseline — T001

2026-11-16. Inspeção feita por leitura de código e por execução local do frontend. Os três
módulos externos foram lidos sem alteração, sem subir serviço e sem ler valores de `.env`.
O que não foi executado está marcado como **não comprovado**.

## 1. Estado do repositório Evidia

| Item | Valor observado |
|---|---|
| Raiz | `blueprint-builder-biz-main` |
| Origin | `https://github.com/walterrosa2/evidia_fundo.git` |
| Baseline | `main`, `5f3a45d` (confirmado) |
| Branch de trabalho | `ia-feature/evidia-operacional`, criada a partir do baseline |
| Mudanças de terceiros | Pacote documental do Codex (CLAUDE.md, Walkthrough.md, PRD.md, Task.md, CHANGELOG.md, docs/, specs/, knowledge/handoff.md) não commitado; levado intacto para a branch |
| Pacote `Evidia_SpecKit_v0.3.zip` | 21 de 21 arquivos de projeto idênticos byte a byte aos já presentes; só `entrega/` (notas de entrega) não existe no projeto |
| `.specify/` | Ignorado pelo Git (política mantida) |
| `knowledge/sessions.md` | 6 sessões Antigravity/Gemini (ago/2026); indexador executado, sem novidades |
| AGENTS.md | Não existe no projeto |

## 2. Frontend existente

- TanStack Start 1.167 + React 19 + Vite 7, via `@lovable.dev/vite-tanstack-config` (inclui
  plugin Cloudflare só no build). Entrada de servidor própria em `src/server.ts`.
- **É SSR**, não SPA estática: `npm run build` gera `.output/server/index.mjs` (Nitro) e
  `.output/public`. Não existe `frontend/dist/index.html` para um catch-all de FastAPI servir.
- Rotas file-based em `src/routes/` (22 arquivos da demo). Dados em `src/data/` (mocks) e
  motores puros em `src/lib/`. Estado em Context + `localStorage`.
- `Dockerfile` atual roda `npm run dev` na porta 8518 (servidor de desenvolvimento em contêiner).
- Scripts reais em `package.json`: `dev`, `build`, `build:dev`, `preview`, `lint` (eslint),
  `format` (prettier). **Não havia `test`** — adicionado neste ciclo (`vitest run`).
- Porta padrão do dev server (8080) **estava ocupada por outra aplicação** nesta máquina.

### Baseline de qualidade (antes de qualquer mudança)

| Comando | Resultado em 2026-11-16 |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 1 — **falha preexistente**: 1 erro `prettier/prettier` em `vite.config.ts:16` (linhas em branco finais) e 6 avisos `react-refresh` em `src/components/ui/*` |

### Geradores de dados da demo

`scripts/extrair_nulidade.py`, `scripts/gerar_nulidade_ts.py` e `scripts/gerar_evidencias_ts.py`
existem. Não foram executados; `nullityReports.ts` e `evidenceDossier.ts` não foram tocados.

## 3. Originação (`originacao-pipeline`, `main` `c81d41c`, árvore limpa)

FastAPI `coletor.api.internal_api:app`, porta 8010, prefixo `/api/v1`, `GET /health` aberto.

- **Autenticação:** sessão opaca em cookie `evid_sessao` (HttpOnly, SameSite=Lax, 7 dias).
  `POST /api/v1/auth/login` com `{email, senha}`. Sem Bearer, sem token de máquina.
  5 erros seguidos bloqueiam o e-mail por 5 min (429 `LOGIN_BLOQUEADO`).
- **Permissões:** cargos `executivo|gestao|estrategico|administrador`. **Não há organização
  ou tenant.** Executivo só vê os próprios casos; caso alheio responde 404. Um usuário
  `administrador` vê todos os casos e **não** tem a ação `estudo_evidia` (não gera estudo pago).
- **Rotas de leitura (comprovadas no código):**
  - `GET /casos` → `list[CasoSaida]`; filtros `etapa`, `linha`, `executivo`, `busca`;
    **sem paginação**, limite interno fixo de 500.
  - `GET /casos/{id}` → `CasoSaida` com `eventos`; 404 `CASO_NAO_ENCONTRADO`.
  - `GET /analisados` → uma linha por CNJ com estudo: `{cnj, titulo, autor, reu, classe, fase,
    estudo_em, reestudo_pendente, executivos}`.
  - `GET /processos/{cnj}/estudo` → `Estudo` (`extra="allow"`); 404 `ESTUDO_NAO_EXISTE`.
  - `GET /processos/{cnj}/estudo.pdf` e `/dossie.pdf` → PDFs **gerados** (relatórios derivados).
- **Custo:** os GETs só leem SQLite/disco. `POST /processos/{cnj}/estudo` chama LLM e gera
  custo — o adaptador nunca o chama.
- **CNJ:** sempre mascarado; o path não é normalizado (igualdade exata).
- **Ausências relevantes:** nenhuma rota entrega autos; não há campo “tribunal” (deriva-se
  do CNJ); partes só aparecem via estudo/analisados; catch-all de SPA devolve 200 + HTML
  para rota errada.
- **Não comprovado:** comportamento em execução, conteúdo real de produção, regras de proxy.

## 4. Nulidade360 (`Dados_Projeto_App_Nulidade`, **não é repositório Git**)

- FastAPI (`src.main:app`, porta 8530) + React; Streamlit legado. **Sem autenticação**, CORS `*`.
- SQLite com caminho fixo relativo ao cwd; `data/`, `logs/`, `reports/` também relativos.
- Rotas: `POST /api/cases` (multipart; `.pdf/.txt/.md`), `POST /api/cases/{id}/evidence-map`
  (.xlsx), `POST /api/cases/{id}/analyze` (background, **não devolve analysis_id**),
  `GET /api/cases/{id}/analyses` (polling).
- Estados: `processing | completed | completed_no_findings | completed_partial | error`.
  Bloco falho entra em `config.failed_blocks[]` e em `blocks_meta[..].status = failed|skipped`.
- **`posicao_processual` tem default silencioso “Polo Passivo”** e não é validada.
- LLM: Gemini, até 14 chamadas por análise. `MOCK_AI=true` existe, mas com PDF ainda há
  upload à Files API antes da checagem — mock sem custo só com `.txt/.md`.
- **Importar os módulos tem efeito colateral**: `src.core.logger` remove todos os sinks do
  Loguru do processo; `database` e caminhos dependem do cwd. Conclusão: integração por
  HTTP ou processo isolado, nunca por import.
- Sem hash de versão (não há Git): só `CHANGELOG.md` e `checklist_version`/`prompt_version`.

## 5. P4 (`E:\...\P4`, `main` `4b4caaa`)

- **Aplicação Streamlit**; sem API HTTP, sem CLI com argumentos. Entrada: **somente `.txt`**
  pré-paginado (`<pagina> N`, `pág. N`, `fls. N`). Não aceita PDF.
- Etapas por bloco de 100 páginas: provas → quesitos → respostas (3 chamadas Gemini pagas).
  **Sem mock, sem timeout, sem retry.**
- Saídas: JSON por bloco em `execucoes/<NOME>/`, SQLite `evid_provas.db`, `relatorio_final.xlsx`
  (abas `Provas`, `Quesitos`, `Respostas`).
- Divergências que o adaptador precisa tratar: campo `resposta` (código) × `resposta_tecnica`
  (prompt e leitores); envoltórios `estrutura_saida`/`estrutura_resposta`/`resposta_estruturada`
  inconsistentes; gravação vazia no SQLite em execução nova; `EXECUCOES_ROOT` fixo em outro
  caminho; referência de página só como texto livre.
- `scripts/gerar_evidencias_ts.py` da Evidia aponta para uma pasta antiga do P4.

## 6. Ambiente

Windows 11; Python 3.13.7 (`py -3`), 3.12 e 3.9 também instalados; Node 22.19.0, npm 10.9.3.
Portas alocadas pelo Painel de Soluções: **frontend 5180, API 8007**.
