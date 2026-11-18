# Refinamento funcional e contratos conceituais

Versão documental 0.3 — 2026-11-16. Complementa spec.md; em conflito, este refinamento prevalece.
Constituição 1.0.0. D1/D2 confirmadas; escolhas de infraestrutura abaixo são propostas.

## Decisões e lacunas delimitadas

| ID | Estado | Decisão ou lacuna | Efeito |
|---|---|---|---|
| D1 | Confirmada | Recebimento do autor e redução de passivo do réu separados; contrato posterior | Não bloquear demonstrativos; campos contratuais nulos |
| D2 | Confirmada | Processos/registros profissionais primeiro; redes sociais complementares revisadas | Sem coletor social automático obrigatório |
| D3 | Pendente | Casos autorizados, tribunais, fontes, orçamento e revisores do piloto | Bloqueia consumo externo/homologação, não contratos e testes sintéticos |
| D4 | Proposta | Backend Python/FastAPI ao lado do frontend atual | Validar runtime TanStack e proxy antes de definir deploy |
| D5 | Pendente | Provedor de identidade, usuários e isolamento organizacional | Modelo pode ser especificado; operação real exige política de acesso |
| D6 | Pendente | Infraestrutura persistente, backup e retenção | Não anunciar operação multiusuário antes de homologar |
| D7 | Pendente | Metodologia econômica aprovada e premissas por caso | Implementar cálculo parametrizado/testes; não emitir recomendação financeira homologada |

Não reabrir D1/D2 como perguntas de descoberta. D4 não autoriza substituir TanStack Start por
SPA estática: inspecionar SSR, rotas e build; documentar escolha compatível em ADR.

## US01 — Importar uma oportunidade com identidade estável

Como analista autorizado, quero selecionar um processo da originação e iniciar sua avaliação
sem duplicar cadastro ou confundir estudo com autos. RF01–RF02; P01/P03/P07.

- Chave de processo: organização + CNJ normalizado; processo comercial tem ID de origem próprio.
- Chave de oportunidade: UUID interno estável, processo, parte/posição e referência da origem.
- Contrato pode ser nulo; definição posterior não cria novo processo nem elimina histórico.
- Importação: organização + origem + ID externo + versão/hash, com operação transacional.
- Mesma requisição concorrente deve retornar o mesmo resultado, não duas oportunidades.
- Reimportação com origem atualizada cria snapshot; edição humana divergente vira conflito.
- Casos sem CNJ válido ficam em rascunho, com motivo, e não são ligados por nome de parte.

AC01: Dado o mesmo snapshot e duas requisições simultâneas, quando importar, então criar uma
operação efetiva e retornar o mesmo ID com registro das tentativas.
AC02: Dado relatório sem autos, quando importar, então classificar como derivado, indicar
documentação faltante e não habilitar parecer integral como concluído.
AC03: Dado acesso revogado, quando consultar ou exportar, então negar no servidor sem revelar
conteúdo; cache não pode contornar autorização.

## US02 — Consultar prova sem perder sua origem

Como revisor, quero chegar ao original a partir do achado e corrigir interpretação sem apagar
a análise anterior. RF02–RF05; P01/P02/P07/P09.

Separar três estados: documento processado; achado revisado; análise atual. Aprovação de um
achado não torna todos os documentos completos. “Validado” significa revisado por responsável,
não verdade judicial estabelecida. Hash não prova autenticidade.

AC04: Dado laudo com versão nova, quando concluir ingestão, então marcar dependentes antigos
como desatualizados e preservar relatório anterior com versão visível.
AC05: Dado achado gerado sem citação resolvível, quando validar schema, então devolver pendência
de evidência e impedir promoção automática a validado.
AC06: Dado bloco falho no Nulidade360, quando integrar saída, então manter parcial, expor bloco
afetado e não completar com mock ou dados de outro processo.

## US03 — Testar os dois lados

Como analista, quero comparar teses do autor e do réu sem misturar posição de quem investe com
papel de quem argumenta. RF06; P04/P05.

Execução do cenário contém participant_id, claim_id, simulated_side, dossier_version e
run_id. Cada argumento contém origem e natureza. Compartilhar evidências originais entre
cenários; conclusões de um cenário não entram como fatos no outro. Contraditório considera
pedidos e partes múltiplas; proibir inversão automática de score para fabricar tese contrária.

AC07: Dado só cenário do autor concluído, quando consultar comparação, então exibir réu como
não analisado, sem risco zero ou probabilidade substituta.
AC08: Dado troca de posição econômica, quando navegar, então preservar ambos os cenários e
alterar apenas leitura econômica pertinente, mantendo fontes e argumentos identificáveis.

## US04 — Examinar vínculos sem falsos positivos automáticos

Como especialista, quero cruzar perito/assistente com advogado, partes e juiz nos cinco anos
anteriores à referência, confirmando identidade e contexto. RF07–RF12; P04/P06/P07.

Pesquisa guarda intervalo inclusivo, timezone, critérios, fonte e cobertura. Data relevante é
a do evento/atuação; distribuição é filtro aproximado somente quando a fonte não oferece
outro campo. “Nenhum resultado” só descreve aquela consulta e cobertura. Falha e sem resultado
são estados diferentes. Análise histórica de atribuição pode usar documento anterior à janela.

Registro de evidência complementar social exige fonte pública, URL, momento da coleta, data
do conteúdo se disponível, autoria atribuída e justificativa de relevância. Fluxo proposto:
candidato → identidade confirmada ou pendente → revisão → validado/descartado/inconclusivo.
Não incluir contratação automática de serviços nem captura massiva de perfis.

AC09: Dado homônimo sem documento corroborante, quando cruzar, então manter candidato distinto.
AC10: Dado atuação em 2023 em processo distribuído em 2018, quando referência for 2026, então
incluir a atuação com data comprovada, indicando limite do filtro do fornecedor se houver.
AC11: Dado assistente da parte, quando detectar contrato com essa parte, então não converter
a relação esperada em suspeição automática.
AC12: Dado foto recebida sem data/autoria confirmadas, quando revisar, então registrar lacunas
e não incorporá-la como vínculo confirmado ou impacto financeiro aprovado.

## US05 — Avaliar autor e réu sem contrato comercial

Como analista, quero dois demonstrativos compreensíveis antes de negociar um instrumento.
RF13–RF14; P05. Todas as moedas, datas e bases precisam coincidir ou ter conversão explícita.

Autor: recebimento bruto por cenário, custos e datas; valor líquido e valor presente quando
houver taxa aprovada. Réu: exposição de referência e desembolso por cenário; redução bruta
= exposição de referência − desembolso no cenário; redução líquida = redução bruta − custos
incrementais ainda não incluídos. Reconciliar componentes para não deduzir custo duas vezes.
Valores negativos são possíveis e devem ser exibidos, não truncados a zero para parecer favorável.

Sem probabilidades aprovadas: mostrar cenários não ponderados. Com probabilidades: exigir
intervalo [0,1] e soma 1 dentro de tolerância documentada, em cenários mutuamente exclusivos.
Taxa de desconto é premissa distinta da probabilidade. Usar decimal para dinheiro; arredondar
na regra declarada e testar reconciliação. “Aprovação” pertence ao revisor de premissas.

Campos price, investor_return e contractual_fee ficam nulos com motivo `contract_not_defined`.
Zero é valor conhecido; nulo é ausência de definição. Definir contrato é etapa futura, não
tarefa para o Claude inventar neste ciclo. Interface, API e exportação preservam essa distinção.

AC13: Dado nenhum contrato, quando calcular ambos os lados com premissas válidas, então entregar
os demonstrativos e marcar remuneração/retorno como não definidos.
AC14: Dado exposição de R$ 1.000.000, desembolso de R$ 700.000 e custo incremental de R$ 50.000
na mesma data-base, então redução bruta = R$ 300.000 e líquida = R$ 250.000; nenhuma vira
receita da Evidia. Exemplo de teste sintético, não dado de caso.
AC15: Dado custo já incluído no desembolso, quando reconciliar, então não descontá-lo novamente.
AC16: Dado apenas score heurístico, quando solicitar valor ponderado, então exigir probabilidade
aprovada ou retornar cenários não ponderados, nunca converter score/100 silenciosamente.

## US06 — Trabalhar nas etapas e tabelas

Como usuário, quero montar minha visão e examinar detalhes sem perder seleção. RF15–RF19; P08.

Filtros: OU na coluna, E entre colunas; facetas recalculadas pelas outras colunas. Valores nulos
têm opção explícita. Ordenação estável usa ID como desempate e tipos corretos; ação/checkbox
não são colunas ordenáveis. Seleção de todos os resultados guarda consulta/versão e exceções;
mudança do conjunto exige recalcular contagem antes de ação em massa. Nunca incluir registros
inacessíveis. Exportação aplica autorização novamente e neutraliza fórmulas injetadas em CSV.

AC17: Dado filtro em duas colunas e duas páginas, quando ordenar, então ordenar todo o conjunto
e preservar IDs selecionados; dados novos invalidam seleção global antiga com aviso.
AC18: Dado detalhe fullscreen, quando voltar, então restaurar caso, etapa, consulta, página e
rolagem. Tooltip perto das quatro bordas continua visível sem corte.
AC19: Dado visão salva de outro usuário/organização, quando acessar, então não revelar colunas
ou dados sem permissão, mesmo que a preferência seja manipulada no cliente.

## US07 — Operar e retomar com evidências

RF01–RF19; P07/P09/P10. Estados de job: queued → running → completed/partial/failed/cancelled.
Retry gera tentativa vinculada à mesma operação; timeout não confirma falha remota definitiva.
Antes de reenviar chamada paga, reconciliar ID/status quando disponível; não prometer exactly-once
de um provedor que não o suporta. Guardar custo desconhecido como desconhecido, não zero.

AC20: Dado reinício do servidor, quando retomar jobs, então reconciliar execução em andamento
sem duplicar documento, achado ou cobrança conhecida. Registrar limite externo se irreconciliável.
AC21: Dado documento com instrução maliciosa, quando analisar, então tratar como conteúdo e
impedir acesso a credenciais/ferramentas por essa instrução.
AC22: Dado falta de segredo, quando iniciar integração, então erro de configuração sanitizado;
modo operacional não muda para demo automaticamente.

## Gates de saída

G0: constituição/escopo consistentes. G1: contratos/schema e fixtures sintéticas validados.
G2: funcionalidades locais verificadas sem segredos/dados operacionais no Git. G3: piloto real
autorizado, revisão especializada e custo medido. G4: decisão humana de publicação.
Só G0 é objetivo desta entrega documental; G1–G4 são futuros. Teste documental não aprova produto.
