# Protocolo do piloto real (T019)

Este documento descreve como executar e registrar o piloto com dados e motores reais. Ele
**não** é o piloto: até aqui tudo foi validado com dados sintéticos e motores simulados, e a
tarefa T019 só é concluída com as evidências abaixo, assinadas por quem responde por cada
frente. Nada neste protocolo deve ser executado sem as autorizações da seção 1.

## 1. O que precisa estar decidido e autorizado

| Item | Quem decide | Sem isso |
|---|---|---|
| D3 — tribunais e segmentos do piloto, volume, orçamento por diligência, fonte de consulta | Responsável pelo negócio | Não há dado real para importar nem fonte para consultar |
| Acesso de serviço à originação (usuário sem a ação de gerar estudo) | Dono da originação | A homologação da origem não roda |
| Autorização de custo para Nulidade360, P4 e modelo de linguagem, com teto por processo | Responsável pelo orçamento | Os motores seguem simulados |
| D5 — papéis, colunas por papel e segregação de quem aprova memorando | Responsável por segurança e operação | Vale a política padrão (seção 4) |
| D7 — homologação da metodologia econômica | Responsável econômico | Os números seguem rotulados como não homologados |
| Base legal e guarda dos dados pessoais do piloto | Encarregado de dados | Não usar dados reais |

## 2. Passos, em ordem

Cada passo tem um comando ou tela e o que guardar como evidência. Evidência com dado pessoal
fica fora do repositório; no repositório entram só contagens e resultados.

1. **Originação real (T005).** Configurar `EVIDIA_ORIGINATION_MODE=http` e as credenciais no
   `backend/.env`. Rodar `python scripts/origination_check.py --documents` em `backend/`. O
   roteiro só emite GET, não grava nada e imprime apenas contagens. Evidência: a saída.
2. **Importação de casos do piloto.** Pela tela de entrada, importar os casos escolhidos em D3,
   confirmando posição e parte. Evidência: quantidade importada, conflitos e rascunhos.
3. **Documentos.** Enviar os autos de cada caso. Conferir contagem de páginas contra o arquivo
   e, em amostra, o texto lido (nativo ou OCR). Evidência: páginas por caso e amostra conferida.
4. **Nulidade360 real (T008).** Com autorização de custo, subir o motor em modo real
   (`scripts/start_nulidade360_live.ps1`, `EVIDIA_NULIDADE360_MODE=live`) e
   executar uma auditoria por caso. Conferir: estado, blocos, páginas citadas, e comparar a
   saída normalizada com a saída original do motor. Registrar o custo informado pelo provedor
   (o motor não informa). Evidência: execuções, divergências de contrato encontradas, custo.
5. **P4 (T009).** Para cada caso, criar o pedido na Evidia, baixar o texto de entrada, executar
   o P4 fora da Evidia e importar o relatório fechando o pedido. Conferir páginas citadas em
   amostra. Evidência: pedidos, itens com e sem página, custo informado pelo provedor.
6. **Diligência em fonte real (T012).** Consultar a fonte definida em D3 para os peritos e
   assistentes do caso; trazer o resultado por planilha, declarando fonte e cobertura.
   Revisor confirma identidades antes de validar qualquer ocorrência. Evidência: consultas,
   homônimos tratados, ocorrências validadas e descartadas com fundamento.
7. **Contraditório.** Elaborar os cenários dos dois lados por pedido, com evidência citada.
   Evidência: pedidos com os dois lados concluídos.
8. **Economia (D7).** Calcular os demonstrativos com premissas aprovadas e conferir a memória
   contra cálculo independente do responsável econômico. Evidência: cálculo independente e
   diferença encontrada (deve ser zero dentro do arredondamento declarado).
9. **Memorando.** Emitir e submeter à decisão de responsável diferente de quem emitiu
   (`EVIDIA_MEMO_DISTINCT_APPROVER=true`). Evidência: versões e decisões.
10. **Volume (D6).** Se o piloto passar de 100 mil registros em uma tabela, rodar
    `python scripts/table_volume.py <N>` com o volume esperado. Evidência: a saída.

## 3. Critérios de aprovação

- Nenhuma citação aceita sem página conferível no documento do dossiê.
- Nenhum homônimo unido sem identificador forte ou decisão de revisor.
- Falha de fonte ou de motor aparece como falha, nunca como “nada encontrado”.
- Custo real por processo dentro do teto autorizado.
- Memória econômica reproduzida por cálculo independente.
- Nenhum dado de uma organização visível a outra; nenhum segredo em log ou exportação.

## 4. Padrões em vigor até decisão em contrário

- **Colunas por papel:** o papel de leitura não vê o identificador na origem, o hash e o nome
  do arquivo dos documentos. Ajuste em `EVIDIA_COLUMN_POLICY`
  (`{"tabela.coluna": ["admin", "reviewer"]}`; `["*"]` libera a todos).
- **Aprovação de memorando:** qualquer revisor decide, inclusive quem emitiu. Para exigir
  outra pessoa, `EVIDIA_MEMO_DISTINCT_APPROVER=true`.
- **Etapas:** sem `?etapa`, o dossiê abre na visão completa.

## 5. Registro do piloto

| Frente | Responsável | Data | Resultado | Evidência |
|---|---|---|---|---|
| Originação real | | | | |
| Documentos e OCR | | | | |
| Nulidade360 real | | | | |
| P4 | | | | |
| Diligência em fonte real | | | | |
| Contraditório | | | | |
| Metodologia econômica (D7) | | | | |
| Papéis e colunas (D5) | | | | |
| Volume (D6) | | | | |
| Segurança e isolamento | | | | |

T019 é marcada como concluída quando todas as linhas tiverem responsável, data e resultado.

## 6. O que a amostra com IA real já mostrou (2026-11-17)

Uma rodada com modelo real sobre caso sintético
(`artifacts/qa/eval/2026-11-17_avaliacao_ia_real.md`) antecipou pontos que o piloto deve
observar com dados reais:

- o motor cita página errada em parte das citações — conferir amostra das páginas corrigidas;
- mais da metade dos achados do motor vem sem lastro conferível e fica pendente;
- duas execuções do mesmo laudo não devolveram o mesmo número de blocos e achados;
- em peça de parte, o modelo tende a tratar narrativa como fato — a Evidia rebaixa para
  alegação, e a promoção é sempre de quem revisa.
