# Relatório de QA — incremento 3 (tabela comum no dossiê)

Data: 2026-11-17 · Branch: `ia-feature/evidia-operacional` (base `main` `5f3a45d`) · Sem commit.
Ambiente e versões: os mesmos do incremento 1 (`2026-11-16_incremento-1.md`).

Todos os dados usados são **sintéticos** (fixture rotulada). Nenhuma API paga foi consumida;
nenhum módulo externo foi alterado ou executado. Este relatório não é homologação jurídica,
econômica nem de integração real. A metodologia econômica continua **não homologada** (D7).

## Resultados

| # | Comando (diretório) | Resultado |
|---|---|---|
| 1 | `python -m pytest` (`backend/`) | **102 passed** (97 anteriores + 5 novos) |
| 2 | `python -m pytest --cov=evidia` (`backend/`) | cobertura total **95%** |
| 3 | `python -m ruff check .` e `ruff format --check .` (`backend/`) | sem pendências |
| 4 | `npm test` (raiz) | **36 passed** em 4 arquivos (34 anteriores + 2 novos) |
| 5 | `npx tsc --noEmit` (raiz) | exit 0 |
| 6 | `npm run build` (raiz) | exit 0 |
| 7 | `npm run lint` (raiz) | exit 1 — **mesma falha preexistente**: 1 erro em `vite.config.ts:16`, 6 avisos em `src/components/ui/*`; nenhum problema nos arquivos novos |
| 8 | `python scripts/smoke_e2e.py` (`backend/`, serviços no ar) | **APROVADO**, sem falhas |
| 9 | `python scripts/ui_journey.py` (`backend/`, Edge) | **APROVADO**, 56 checagens (48 anteriores + 8 novas), sem erro de console; três execuções seguidas sem falha |

Sem migração nova: o banco permanece em `0002 (head)`.

## O que os testes novos cobrem

| Comportamento | Onde | Situação |
|---|---|---|
| Documentos: uma linha por versão, ordem padrão por título e versão, filtro e ordenação numérica, referência ao documento na linha | `test_tables.py` | Passa |
| Afirmações: ordem de registro, filtro por revisão, citação ausente como filtro de vazio, revisão muda a versão do resultado | `test_tables.py` | Passa |
| Nova versão muda a versão do resultado da tabela e marca a afirmação citada como desatualizada | `test_tables.py`, `ui_journey.py` | Passa |
| Tabela do dossiê exige escopo (422 `scope_required`); oportunidade de outra organização responde 404 na tabela e na exportação; dossiês da mesma organização não se misturam | `test_tables.py` | Passa |
| Exportação das tabelas do dossiê respeita filtro e seleção e neutraliza fórmulas | `test_tables.py`, `ui_journey.py` | Passa |
| Consultas das duas tabelas convivem na URL do dossiê e sobrevivem a abrir e fechar a ficha | `ui_journey.py` | Passa |
| AC17 na interface: paginação com mais de uma página traz registros diferentes | `ui_journey.py` (tabela de documentos, 10 por página) | Passa — pendência do incremento 2 fechada |
| “Enviar Nova Versão” só aparece na versão vigente; a anterior mantém “Abrir Original” | `ui_journey.py` | Passa |

## Defeitos encontrados e corrigidos

1. **Roteiro de interface lia a tabela cedo demais** (não era defeito do produto). Depois de
   ordenar ou mudar o tamanho da página, ele esperava “rede ociosa”, que retorna de imediato
   quando a consulta ainda não partiu, e lia a página anterior. A falha era intermitente e já
   existia no incremento 2, onde passava por coincidência da ordem dos dados. Corrigido:
   espera pelo fim do indicador “Atualizando…” da tabela.
2. Seletores do roteiro ajustados aos novos cabeçalhos e ao dossiê sintético, que acumula
   documentos entre execuções.
3. Larguras iniciais de colunas numéricas estreitas cortavam o rótulo do cabeçalho; ajustadas.

## Limites e pendências

- **Não executado:** leitor de tela; navegadores além do Edge; teste de carga; contêiner Docker;
  painéis de filtro nas bordas superior e esquerda.
- **Tabela comum:** reordenar colunas é por botões; a única ação em massa é exportar; lacunas
  e execuções anteriores de cálculo seguem em lista simples; a consulta é montada em memória
  (limite declarado no código); visão salva vale para a tabela em qualquer dossiê.
- **Mensagens de erro antigas do servidor** continuam sem acentuação.
- **Bloqueado por dependência:** originação real (D3); Nulidade360/P4 (custo e autorização);
  metodologia econômica (D7); política de acesso por coluna e gestão de usuários (D5).

## Artefatos

- Captura nova (dados sintéticos): `artifacts/qa/ui/08-tabelas-do-dossie.png`; as anteriores
  foram regeneradas.
- Contratos regenerados: `specs/001-evidia-operacional/contracts/openapi.json`.
