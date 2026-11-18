# Relatório de QA — incremento 2 (tabela comum e demonstrativos na tela)

Data: 2026-11-16 · Branch: `ia-feature/evidia-operacional` (base `main` `5f3a45d`) · Sem commit.
Ambiente e versões: os mesmos do incremento 1 (`2026-11-16_incremento-1.md`).

Todos os dados usados são **sintéticos** (fixture rotulada). Nenhuma API paga foi consumida;
nenhum módulo externo foi alterado ou executado. Este relatório não é homologação jurídica,
econômica nem de integração real. A metodologia econômica continua **não homologada** (D7).

## Resultados

| # | Comando (diretório) | Resultado |
|---|---|---|
| 1 | `python -m pytest` (`backend/`) | **97 passed** (82 anteriores + 15 novos) |
| 2 | `python -m pytest --cov=evidia` (`backend/`) | cobertura total **95%** |
| 3 | `python -m ruff check .` (`backend/`) | All checks passed |
| 4 | `npm test` (raiz) | **34 passed** em 4 arquivos (10 anteriores + 24 novos) |
| 5 | `npx tsc --noEmit` (raiz) | exit 0 |
| 6 | `npm run build` (raiz) | exit 0 |
| 7 | `npm run lint` (raiz) | exit 1 — **mesma falha preexistente**: 1 erro em `vite.config.ts:16`, 6 avisos em `src/components/ui/*`; nenhum problema nos arquivos novos |
| 8 | `python scripts/smoke_e2e.py` (`backend/`, serviços no ar) | **APROVADO**, sem falhas |
| 9 | `python scripts/ui_journey.py` (`backend/`, Edge) | **APROVADO**, 48 checagens (22 anteriores + 26 novas), sem erro de console |
| 10 | `alembic upgrade head` no banco local | `0002 (head)` aplicada |

## Aceites cobertos neste incremento

| Aceite | Onde | Situação |
|---|---|---|
| AC17 filtro em duas colunas e duas páginas → ordena o conjunto inteiro, IDs preservados; dado novo invalida seleção global | `test_tables.py` (servidor), `tableState.test.ts` (seleção) | Passa. Na interface a ordenação, o filtro e a seleção foram exercitados; **duas páginas na interface não**, porque o banco local tinha menos de 10 registros |
| AC19 visão de outro usuário/organização e coluna sem permissão não vazam | `test_tables.py` | Passa. Nenhuma coluna real é restrita hoje: o teste restringe “ID na Origem” para exercitar o mecanismo (a política de colunas depende de D5) |
| AC18 detalhe em tela inteira, voltar restaura URL; painéis sem corte | `ui_journey.py` | Passa para a memória de cálculo e para a lista (voltar do dossiê restaura consulta). Filtro testado nas bordas **direita e inferior**; superior e esquerda não |
| AC13 sem contrato → campos contratuais “Não definido” na tela e na exportação | `ui_journey.py`, `test_tables.py` | Passa |
| AC14 R$ 1.000.000 / 700.000 / 50.000 → R$ 250.000 na tela, na memória e no CSV | `ui_journey.py`, `test_tables.py` | Passa |
| RF14 (parcial) valor abre memória reproduzível; resumo, detalhe e exportação com os mesmos números | `test_economics.py` (reconciliação), `ui_journey.py` | Passa para fórmula e componentes; ver limites |
| US06 exportação reaplica autorização e neutraliza fórmulas | `test_tables.py` | Passa |

## Defeitos encontrados e corrigidos

1. **Envio simulado da demonstração visível na operação.** O botão flutuante “Upload do
   processo”, que apenas simula um recebimento, aparecia em todas as rotas, inclusive
   `/operacao` — presente desde o incremento 1 e não percebido então. Corrigido em
   `src/routes/__root.tsx`: não é renderizado nas rotas operacionais. Checagem nova no roteiro.
2. **Textos do motor econômico sem acentuação na tela** (fórmulas e rótulos dos componentes).
   Corrigidos em `backend/evidia/domain/economics.py`.
3. Dois seletores ambíguos do próprio roteiro de interface (não eram defeito do produto).

## Limites e pendências

- **Não executado:** leitor de tela; navegadores além do Edge; teste de carga; contêiner Docker;
  paginação com duas páginas na interface.
- **Mensagens de erro do servidor** fora do motor econômico continuam sem acentuação
  (ex.: “Autos integrais nao fornecidos pela origem”). Pendência de texto, sem efeito funcional.
- **Tabela comum** aplicada apenas à lista de oportunidades. Documentos e afirmações do dossiê
  seguem com a tabela simples. Reordenar colunas é por botões, não por arrasto. A única ação
  em massa é exportar. A consulta é montada em memória por organização (limite declarado no código).
- **Memória de cálculo** não traz sensibilidade, vínculo com achados/impactos (depende de
  T010/T016), responsável e confiança por componente, nem memorando versionado. Essas ausências
  são declaradas na própria tela.
- **Bloqueado por dependência:** originação real (D3); Nulidade360/P4 (custo e autorização);
  metodologia econômica (D7); política de acesso por coluna e gestão de usuários (D5).

## Artefatos

- Capturas novas (dados sintéticos): `artifacts/qa/ui/06-memoria-de-calculo.png`,
  `07-tabela-comum.png`; as anteriores foram regeneradas.
- Contratos regenerados: `specs/001-evidia-operacional/contracts/openapi.json`.
