# Relatório de QA — incremento 4 (contratos de motor e textos do servidor)

Data: 2026-11-17 · Branch: `ia-feature/evidia-operacional` (base `main` `5f3a45d`) · Sem commit.
Ambiente e versões: os mesmos do incremento 1 (`2026-11-16_incremento-1.md`).

Todos os dados usados são **sintéticos**. **Nenhum motor (Nulidade360, P4) foi executado** e
nenhuma API paga foi consumida. Este relatório não é homologação jurídica, econômica nem de
integração real.

## Resultados

| # | Comando (diretório) | Resultado |
|---|---|---|
| 1 | `python -m pytest` (`backend/`) | **120 passed** (102 anteriores + 18 novos) |
| 2 | `python -m pytest --cov=evidia` (`backend/`) | cobertura total **96%** |
| 3 | `python -m ruff check .` e `ruff format --check .` (`backend/`) | sem pendências |
| 4 | `python scripts/export_contracts.py` (`backend/`) | 8 arquivos gerados; `test_contracts.py` confirma que estão em dia |
| 5 | `python scripts/smoke_e2e.py` (`backend/`, serviços no ar) | **APROVADO**, sem falhas |
| 6 | `python scripts/ui_journey.py` (`backend/`, Edge) | **APROVADO**, 56 checagens, sem erro de console |

O frontend não foi alterado neste incremento; `npm test` (36), `npx tsc --noEmit` e
`npm run build` valem os resultados do incremento 3. `npm run lint` mantém a falha
preexistente em `vite.config.ts`.

## Aceites cobertos no nível de contrato

| Aceite | Teste | Situação |
|---|---|---|
| AC05 achado sem citação resolvível devolve pendência e não é promovido a validado | `test_ac05_*` | Passa — no schema e na regra; ainda não há achado real |
| AC06 bloco falho mantém a execução parcial, mesmo com rótulo “concluído” do motor | `test_ac06_*` | Passa — sobre os estados inventariados do Nulidade360, sem execução real |
| AC07 só o autor concluído: réu aparece como não analisado, sem valor substituto | `test_ac07_*` | Passa |
| AC08 comparação preserva os dois cenários e não depende da posição econômica | `test_ac08_*` | Passa — a parte “leitura econômica conforme o contrato” depende de T010/T013 |
| RF04 lado simulado obrigatório e confirmado; custo desconhecido não é zero | `test_lado_simulado_*`, `test_custo_*` | Passa |
| RF06 argumento sem evidência fica como hipótese para validação | `test_rf06_*` | Passa |

Estes testes provam as regras e o formato. **Não provam integração**: AC06 e AC20 só ficam
atendidos quando o adaptador rodar contra o motor (T008/T009).

## Textos do servidor

- 68 mensagens acentuadas por substituição restrita a literais de texto (comentários e
  identificadores não foram tocados); a lista completa foi revisada antes de aplicar.
- Um teste comparava o texto antigo (`versao 2`) e foi atualizado.
- **Deixados como estavam, de propósito:** descrições das lacunas geradas na importação
  (ex.: “Autos integrais nao fornecidos pela origem”) e a fixture da originação. Elas entram
  no snapshot normalizado; mudá-las alteraria o hash e criaria uma versão nova de snapshot
  para dados já importados. Corrigir isso pede decisão sobre os dados existentes.

## Ocorrência operacional

Ao encerrar os serviços do incremento 3, o processo filho do `uvicorn --reload` ficou vivo e
segurando a porta 8007; o `_start.ps1` recusou subir (comportamento correto do script). O
processo foi identificado e encerrado. Registrado no handoff.

## Limites e pendências

- Contratos de motor e contraditório **sem rota e sem tela**; tipos do frontend entram com a
  primeira rota (T008/T010/T016).
- Normalização específica do P4 e contratos de diligência de vínculos (RF07–RF12) não escritos.
- **Bloqueado por dependência:** originação real (D3); Nulidade360/P4 (custo e autorização);
  metodologia econômica (D7); política de acesso por coluna (D5).
