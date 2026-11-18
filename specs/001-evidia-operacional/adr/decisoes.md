# Decisões de arquitetura — T002

2026-11-16. Decisões técnicas reversíveis tomadas para o ambiente **local/desenvolvimento**.
Baseiam-se em `../research.md`. Nenhuma substitui as decisões de negócio pendentes
(D3, D5, D6, D7), que continuam delimitando a homologação operacional.

## ADR-001 — Runtime: API ao lado do frontend SSR (fecha D4)

**Contexto.** O frontend é TanStack Start com SSR (Nitro); não produz `dist/index.html`.
**Decisão.** Dois processos: frontend Node (porta 5180) e API FastAPI (porta 8007). A API
expõe só `/health` e `/api/v1/*` — **sem catch-all de SPA**. O navegador chama a API direto,
com `VITE_EVIDIA_API_URL` e CORS de origem explícita.
**Alternativas.** (a) FastAPI servindo o build: inviável sem abandonar SSR; (b) funções de
servidor do TanStack falando com Python: acopla o runtime Cloudflare ao backend; (c) proxy do
Vite: só existe em desenvolvimento.
**Impacto.** Frontend e API precisam do mesmo host (`localhost`) para o cookie de sessão.
Dados operacionais são buscados no cliente (TanStack Query); o SSR entrega a casca.
**Pendente.** Empacotamento Docker/produção dos dois serviços e proxy reverso único.

## ADR-002 — Banco: SQLite local com migrações Alembic (D6 parcial)

**Decisão.** SQLAlchemy 2 + Alembic; SQLite em `backend/data/evidia.db` (WAL, chaves
estrangeiras ativas). Requisições que alteram estado abrem a transação já com trava de
escrita (`BEGIN IMMEDIATE`); leituras não travam.
**Razão.** Volume comprovado é de um ambiente local, um usuário. Nada de servidor de banco
antes de haver necessidade.
**Alternativa.** PostgreSQL — necessário para operação multiusuário real; o modelo não usa
recursos exclusivos do SQLite e a idempotência também se apoia em restrição de unicidade.
**Impacto.** Escritas são serializadas. Migração é aditiva; backup por `python -m evidia.ops backup`.
**Pendente (D6).** Infraestrutura persistente, backup agendado e retenção.

## ADR-003 — Identidade: autenticação local com sessão opaca (D5 parcial)

**Decisão.** Usuário/senha locais (scrypt), sessão por token opaco em cookie
`HttpOnly; SameSite=Strict`; o banco guarda apenas o SHA-256 do token. Papéis:
`admin`, `analyst`, `reviewer`, `viewer`. Toda consulta filtra pela organização do usuário
da sessão; recurso de outra organização responde 404. Mutações por cookie exigem o cabeçalho
`X-Evidia-Request` (proteção contra CSRF).
**Razão.** Revogação imediata no servidor (AC03) e nenhuma credencial acessível ao JavaScript.
**Limites.** Só o administrador inicial é criado (via `.env`); não há tela nem rota de gestão
de usuários, nem limite de tentativas de login.
**Pendente (D5).** Provedor de identidade, cadastro de usuários e política de acesso.

## ADR-004 — Jobs: tabela no banco e worker no próprio processo (não implementado)

**Decisão.** Quando houver execução de motor (T008/T009), usar tabela de jobs com estados
`queued → running → completed/partial/failed/cancelled`, tentativas vinculadas à mesma
operação e reconciliação na inicialização. Sem Redis/Celery.
**Estado.** Decidido, **não implementado** neste incremento: importação e ingestão de
documento são síncronas e curtas.

## ADR-005 — Documentos: arquivos em disco endereçados por conteúdo (D6 parcial)

**Decisão.** Original gravado em `backend/data/storage/<org>/<aa>/<sha256>`; o banco guarda
hash, versão, origem, páginas reais e autoria. Arquivo nunca é sobrescrito. Acesso apenas
pela API, com autorização por organização e `Cache-Control: no-store`.
**Impacto.** `backend/data/` fica fora do Git e da imagem Docker do frontend.
**Pendente (D6).** Criptografia em repouso, retenção e descarte.

## ADR-006 — Integração com motores: sempre fora do processo da Evidia

**Decisão.** Nulidade360 por HTTP (sua API existente); P4 por execução isolada em subprocesso
com diretório de trabalho próprio. Nunca `import` dos módulos externos.
**Razão.** Importar o Nulidade360 remove os sinks de log do hospedeiro e grava banco/pastas
no cwd; o P4 é uma aplicação Streamlit com efeitos no import.
**Consequências já conhecidas para T008/T009.** Enviar `posicao_processual` sempre explícita
(há default “Polo Passivo”); o `analyze` não devolve ID — reconciliar por listagem antes de
repetir; no P4, aplicar timeout/retry por fora, normalizar envoltórios e converter PDF em
texto paginado antes de enviar.
**Estado.** Não implementado. Execução real gera custo (Gemini) e exige autorização (D3).

## ADR-007 — Originação: usuário de serviço somente-leitura e modo explícito

**Decisão.** Adaptador HTTP com login por e-mail/senha e cookie; só emite GET. Modo definido
por `EVIDIA_ORIGINATION_MODE`: `disabled` (erro de configuração), `fixture` (dados sintéticos
rotulados) ou `http`. Trocar o modo não converte registros sintéticos em reais: a marca
`is_synthetic` é gravada em cada oportunidade e snapshot.
**Recomendação.** Usuário de serviço com cargo `administrador` na originação (vê os casos,
não gera estudo pago). Como a originação não tem organização, o isolamento por organização
é responsabilidade da Evidia.
**Pendente (D3).** Credencial de serviço e teste contra instância em execução.

## Constitution Check do incremento 1

| Princípio | Situação | Evidência |
|---|---|---|
| P01 Evidência e proveniência | Atendido no escopo entregue | Afirmação exige citação resolvível para validar; snapshot com hash; `test_dossier.py` |
| P02 Demo separada | Atendido (com correção no incremento 2: envio simulado da demo retirado das rotas operacionais) | Rotas `/operacao/*`, marca “Dado sintético”, sem fallback (`test_import.py::test_ac22…`, `api.test.ts`) |
| P03 Integrações por contrato | Parcial | Originação por contrato simulado e fixture; **sem homologação real**; Nulidade360/P4 não integrados |
| P04 Contraditório bilateral | Não iniciado | Oportunidade registra posição; cenários (T010) pendentes |
| P05 Avaliação econômica | Parcial | Motor e API testados (AC13–AC16); tela e memória de cálculo no incremento 2; sem sensibilidade nem vínculo com achados; metodologia não homologada (D7) |
| P06 Diligência | Não iniciado | T011–T012 |
| P07 Privacidade e auditoria | Parcial | Isolamento, sessão, auditoria JSONL sanitizada testados; criptografia/retenção pendentes |
| P08 Jornada e detalhes | Parcial | Tela inteira, cabeçalho fixo e portal verificados no navegador; tabela comum (filtros, colunas, seleção, visões) na lista de oportunidades no incremento 2; tabelas do dossiê pendentes |
| P09 Qualidade por evidências | Atendido no escopo | `artifacts/qa/2026-11-16_incremento-1.md` e `_incremento-2.md` |
| P10 Reversibilidade | Atendido | Branch dedicada, migração aditiva, restauração em cópia testada, sem commit/push |
