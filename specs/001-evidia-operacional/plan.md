# Plano técnico — Evidia operacional

2026-11-16. Status: plano proposto, não implementado. Constituição 1.0.0; spec/refinamento 0.3.

## Baseline e preservação

Raiz: projeto blueprint-builder-biz-main indicado no PRD; main, HEAD observado 5f3a45d.
Origin: https://github.com/walterrosa2/evidia_fundo.git. Não alterado branch/commit nesta entrega.
Revalidar Git e arquivos antes de implementar. Não tratar registros antigos de QA como testes atuais.
Preservar demo, origem imutável dos arquivos gerados e modos explicitamente isolados.

## Constitution Check

| Princípio | Atendimento no desenho | Verificação de implementação |
|---|---|---|
| P01 | Snapshot, documento/afirmação versionados | AC02, AC04–AC06 |
| P02 | Modo demo separado, sem fallback | AC07, AC22 |
| P03 | Adaptadores Evidia; originação intacta | AC01–AC03, AC06, AC20 |
| P04 | Cenário por participante/pedido/lado | AC07–AC08, AC11 |
| P05 | Autor/réu separados; nulos contratuais | AC13–AC16 |
| P06 | Identidade, janela e revisão | AC09–AC12 |
| P07 | Autorização server-side e logs sanitizados | AC03, AC19, AC21–AC22 |
| P08 | Etapas/tabela/fullscreen | AC17–AC19 e testes visuais |
| P09 | Matriz RF/AC/tarefa/evidência | Todos; execução futura |
| P10 | Migração aditiva e handoff | T001, T004, T019–T020 |

Check do desenho: alinhado, com D3/D5/D6/D7 bloqueando homologação operacional, não preparação
local. Check de runtime: NÃO EXECUTADO. Não confundir essas duas avaliações.

## Arquitetura proposta

Frontend TanStack Start/React preservado → backend de orquestração proposto FastAPI → banco
transacional e armazenamento de documentos com controle de acesso → adaptadores de originação,
Nulidade360, P4 e fontes de diligência. Interface usa DTOs e funções de domínio, não dados
demonstrativos como fallback operacional. Rotas de API internas novas ainda serão definidas.

Antes de scaffold, ADR deve decidir: runtime TanStack SSR ou rota compatível de frontend;
serviços/processos locais e empacotamento; autenticação; SQLite local isolado versus PostgreSQL
para multiusuário; fila persistente; armazenamento de arquivos e política de retenção. Não impor
Redis/Celery ou banco de grafos sem volume que justifique; relações podem começar relacionais.
Não anunciar que FastAPI pode servir o build SSR como se fosse apenas frontend/dist.

## Contratos e modelo de dados

Entidades e campos em spec.md/refinamento.md são conceituais. Materializar contratos versionados
com schemas de entrada/saída e erros antes de conectar provedores. Rotas de originação citadas
no diagnóstico são existentes; disponibilidade de autenticação e campos precisa de teste.
P4 não tem API HTTP confirmada: escolher job isolado ou contrato de serviço por ADR, sem editar
o projeto externo. Nunca importar módulos externos que executem efeitos colaterais no startup.

Chaves: organization_id, process_id, opportunity_id, document_version_id, run_id, review_id.
Toda relação e autorização recebe organização/caso; não confiar apenas em IDs enviados pela UI.
Confiança de extração, certeza de identidade e relevância jurídica são campos diferentes.

## Incrementos

1. Contratos, autorização e persistência; fixtures sintéticas e modo operacional vazio honesto.
2. Importação idempotente, dossiê, fontes e versões; primeira jornada vertical.
3. Adaptadores e saídas parciais; revisão de achados; contraditório bilateral.
4. Diligência de processos/registros, correspondências e evidência complementar revisada.
5. Demonstrativos separados e memória de cálculo com premissas explícitas.
6. Consolidação da navegação, tabelas, memo e homologação integrada.

Cada incremento inclui interface utilizável, testes e evidências; não adiar segurança ou UX
para o último. Para integração sem fonte autorizada, implementar contrato/mock identificado e
registrar o teste real como pendente; não chamar de integração pronta.

## Operação e migração

Consultar painel-solucoes-manager para portas/cadastro; .env e .env.example; admin real somente
em armazenamento autorizado/Painel, nunca no exemplo versionado. Python com ambiente detectado,
Loguru e logs/ ignorado. _start.ps1/_start.bat devem preparar ambiente e abrir navegador após
healthcheck; opção NoBrowser. Documentar comandos reais somente após implementação.
Docker/produção dependem de ADR do frontend; catch-all não pode interceptar API.

Migração aditiva: backup do dado operacional; migrar em cópia; validar contagens/invariantes;
testar restauração; habilitar nova versão por configuração; rollback volta ao caminho anterior
sem apagar documentos/execuções criados. Demo não será migrada automaticamente para fatos reais.

## QA e liberação

Implementar unidades de dinheiro/identidade/filtros; contrato com mocks; autorização negativa;
jobs/retries; jornada de ambos os lados; UI teclado, viewport e tabelas largas. Separar falhas
pré-existentes de regressões sem ignorar QA essencial. Logs/evidências sem PII nos artefatos.
Piloto requer D3/D5/D6/D7. Publicação requer autorização separada após evidências.
