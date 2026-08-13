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
