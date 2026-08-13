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
