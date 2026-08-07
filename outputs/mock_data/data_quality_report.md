# Relatório de qualidade dos dados mockados EvidIA

## Status

**Parcial, com bloqueio de schema (`BLOCKED_SCHEMA_GAPS`).**

A camada persistível não foi gerada. Foi criada apenas uma projeção isolada para demonstração, pois o repositório não contém backend SQLAlchemy/Pydantic nem convenção real de seed.

## Fontes analisadas

| Fonte | Resultado da leitura | Uso |
|---|---:|---|
| `evidencias_FEDxSAP.xlsx` | 1 aba, 743 registros de evidência, 8 colunas, sem fórmulas | Fatos, referências de página, conflito do número processual e disponibilidade do mapa FEB × SAP |
| `nulidade360_caso_17_analise_25_Federação Espírita X SAP.docx` | 20 findings aceitos/editados | Score, risco global, pilares e qualidade do suporte |
| `nulidade360_caso_18_analise_26_PAULO GRITTI x MATSUDA.docx` | 19 findings aceitos/editados | Score, risco global, pilares e ausência de mapa |
| `nulidade360_caso_19_analise_27_ELETROMAR X TOTVS.docx` | 20 findings aceitos/editados | Score, risco global, pilares e ausência de mapa |
| `Treino - Solução ConcilIA...vtt` | Transcrição lida por tópicos de risco, compra, Deal Flow, valuation e rastreabilidade | Intenção comercial e semântica da demonstração |
| `analise plataforma (1).txt` | 25 linhas | Requisitos de produto e critérios de apresentação |
| Código do repositório | Frontend React/TanStack, dados mockados TypeScript e validação Zod pontual | Consumidores de tela; confirmação de ausência do backend solicitado |

Os relatórios Word foram lidos estruturalmente, incluindo tabelas. A planilha foi importada e inspecionada por aba, região e fórmulas; ela possui 744 linhas contando o cabeçalho.

## Inventário resultante

- Casos na projeção: **3**.
- Análises de origem resumidas: **3**.
- Findings de origem contabilizados: **59** (20 FEB, 19 Paulo, 20 ELETROMAR).
- Findings persistíveis gerados: **0**.
- Registros de evidência disponíveis para FEB × SAP: **743**.
- Evidence IDs persistíveis gerados: **0**.
- Mapas ausentes: Paulo Gritti × Matsuda e ELETROMAR × TOTVS.

Os 743 registros da planilha não foram transformados em IDs de banco. A posição da linha não foi usada como identidade persistente.

## Arquivos e estruturas faltantes

- `evidencias_paulo_gritti.*`.
- Mapa de evidências de ELETROMAR × TOTVS.
- Movimentações primárias mais recentes para confirmar a fase atual de cada caso.
- Modelos SQLAlchemy e schemas Pydantic reais.
- Enums e constraints do backend.
- Mecanismo oficial de seed/fixture.
- Função oficial do backend para score global e risco.

## Conflitos relevantes

### Número processual de FEB × SAP

O relatório Nulidade360 registra `1160205320208260100`. O mapa de evidências reproduz `1116020-53.2020.8.26.0100` em documento judicial. A projeção usa o segundo formato, preserva o valor concorrente e exige revisão humana antes de persistência.

### Fase processual de FEB × SAP

O relatório usa `laudo juntado`, mas a planilha contém atos recursais posteriores, inclusive referência a documento liberado em 31/01/2024. O rótulo antigo não foi apresentado como fase atual confirmada. A projeção marca a fase como em revisão.

### Evidências disponíveis, mas não vinculadas

O relatório FEB × SAP marca os 20 findings como `sem_mapeamento`, enquanto a planilha separada contém 743 registros. Isso não autoriza ligação automática. Sem schema, regra de identidade e revisão jurídica, os findings permanecem sem IDs vinculados.

### Semântica do maior risco em ELETROMAR

A explicação do relatório informa maior risco de `99.29`, mas também declara zero findings críticos; a distribuição extraída contém 17 findings baixos e 3 moderados. O score global `46.73` e o nível global `moderado` foram preservados. O máximo isolado não foi convertido em criticidade global.

### Achado crítico de FEB × SAP

O pilar P13 aparece com score `100.0`, porém o relatório indica documento essencial ausente e ausência de mapeamento. O dado foi preservado como valor da fonte, acompanhado de `review_flag`, e não tratado como nulidade confirmada.

## Normalizações e decisões

- Scores globais foram preservados com `score_origin = source_report`; nenhuma fórmula jurídica paralela foi criada.
- Risco jurídico e atratividade de compra foram separados.
- O ranking demonstrativo é ELETROMAR → FEB → Paulo, consistente com os scores globais e com a expectativa comercial documentada.
- A fase processual foi marcada como não confirmada quando faltava a movimentação primária mais recente.
- Campos financeiros sem base documental ficaram nulos no card principal.
- Cenários financeiros foram isolados e marcados como `simulated_business_parameters`.
- Nenhum CPF, RG, e-mail, telefone, endereço residencial ou dado bancário das fontes foi reproduzido.
- Casos sem documentação suficiente (Cobex, Lagoa do Chupé e CAMI/KAMI) ficaram apenas em fila futura, sem conteúdo jurídico inventado.
- O valor inválido `ultracritico` não foi usado.

## Justificativa do ranking

1. **ELETROMAR × TOTVS** — score global 46,73, risco moderado e menor concentração de findings severos no resumo do relatório. É o melhor caso relativo da amostra, mas continua dependente de mapa e revisão.
2. **Federação Espírita Brasileira × SAP Brasil** — score 51,88, risco moderado e mapa de 743 registros, ainda sem vínculo referencial aos findings. A qualidade e a completude da análise impedem promovê-lo automaticamente para a primeira posição.
3. **Paulo Gritti × Matsuda** — score 80,80, risco alto, vários pilares críticos e mapa de evidências ausente. É o pior caso relativo para compra sem documentação complementar.

O ranking mede atratividade relativa para a demonstração. Ele não inverte o significado do risco nem representa recomendação real.

## Limitações para interface e persistência

Os campos de ranking, cenários financeiros, contexto da Ceci, conflito de fontes e estado de verificação pertencem somente à projeção. Sem backend real não é possível afirmar quais deles cabem em `Case`, `Analysis`, `Finding`, `EvidenceMap` ou `EvidenceItem`.

Também não foi possível validar chaves estrangeiras, executar Pydantic real ou fazer dry-run de seed. Por esse motivo, a carga **não está pronta para persistência**.
