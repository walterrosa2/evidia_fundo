# Especificação funcional — Evidia

Versão 0.3, 16/11/2026. Proposta baseada na inspeção local descrita em `Diagnostico_Evidia.md`, com decisões D1 e D2 confirmadas pelo usuário: avaliações separadas do autor e do réu, contrato posterior; processos e registros profissionais prioritários, redes sociais complementares e revisadas. Requisitos abaixo descrevem comportamento futuro, salvo menção explícita ao estado atual.

Refinamento complementar normativo: `refinamento.md` (US01–US07, AC01–AC22).
Constituição aplicável: `.specify/memory/constitution.md` 1.0.0.

## 1. Jornada principal

| Etapa de navegação | Ações principais | Entrega e condições |
|---|---|---|
| 1. Entrada do ativo litigioso | Selecionar na originação; confirmar partes e posição; complementar documentos | Ativo identificado, origem e lacunas documentais visíveis |
| 2. Estruturação e rastreabilidade | Organizar documentos, OCR, páginas, cronologia, participantes e afirmações | Dossiê versionado; fontes e qualidade consultáveis |
| 3. Motores de inteligência | Executar Nulidade360, inteligência probatória/P4 e diligência de vínculos | Achados separados de conclusões humanas |
| 4. Contraditório: autor e réu | Comparar teses, contraprovas, respostas e riscos residuais | Dois cenários sobre a mesma versão de evidências |
| 5. Avaliação econômica | Avaliar recebimento do autor e redução de passivo do réu separadamente | Cenários com memória de cálculo; contrato e retorno do investidor em etapa posterior |
| 6. Decisão e negociação | Consolidar pareceres, pendências, limites e recomendação | Memo versionado e aprovado por responsável |

O novo módulo se chama provisoriamente **Diligência de vínculos e qualificação técnica** e aparece dentro da etapa 3. Seus achados alimentam as etapas 4–6. Originação aparece como acesso à seleção da etapa 1, mantendo sua aplicação existente. Dashboard pode permanecer como “Visão da carteira”, acessório à jornada.

As etapas exibem estados: não iniciada, em andamento, parcial, aguardando documento, aguardando revisão, concluída, desatualizada e falhou. Leitura de resultados anteriores continua possível; dados novos marcam resultados dependentes como desatualizados. Não exigir repetição de todas as etapas sem necessidade.

## 2. Entrada e integração com originação

### RF01 — Selecionar oportunidade sem alterar o módulo de origem

Como analista, quero selecionar um processo já encontrado para iniciar sua diligência sem repetir cadastro.

Implementação proposta: adaptador no lado Evidia consulta as rotas existentes autorizadas. Não acessar diretamente nem escrever no banco da originação. Não disparar estudo pago ou reprocessamento na origem apenas para importar.

Fluxo: consultar → selecionar processo → mostrar resumo e cobertura → confirmar posição/participantes → importar snapshot → criar ou localizar ativo → mostrar documentos disponíveis e pendências. O usuário vê a data da última consulta e um link para a origem.

Contrato conceitual do snapshot: sistema de origem, identificador do caso comercial quando aplicável, CNJ normalizado, tribunal, partes e papéis, data de atualização, estudos disponíveis, referências de documentos, restrições de acesso e hash do conteúdo importado. Somente campos efetivamente fornecidos podem ser preenchidos como conhecidos.

Rotas comprovadas no código incluem `/api/v1/casos`, `/api/v1/casos/{caso_id}`, `/api/v1/analisados` e `/api/v1/processos/{cnj}/estudo`. Não está definido que uma só rota satisfaça o contrato. Homologar mapeamento de identificadores, autorização, paginação e documentos. Não criar endpoint fictício para preencher a lacuna.

Regras:

- Processo, oportunidade comercial e posição econômica são entidades distintas.
- Um processo pode sustentar oportunidades diferentes; identificar a oportunidade por organização, origem, posição e ID estável. O instrumento pode permanecer “não definido” nesta fase. Sua definição futura cria uma versão/vínculo contratual sem duplicar ou perder o histórico da oportunidade.
- Repetir a importação do mesmo snapshot não duplica registros. Atualização gera nova versão; não sobrescreve parecer aprovado.
- Mudança de CPF/nome/polo deve gerar conflito a revisar, não substituição silenciosa.
- Permissão para consultar metadados não implica permissão para obter autos.
- Relatório PDF de estudo/dossiê da originação é classificado como relatório derivado.
- Falha de autenticação, indisponibilidade ou limite do fornecedor produz estado explícito e opção de tentar novamente.

Aceite: dado um processo já importado, ao selecioná-lo de novo, reutilizar o ativo correspondente; dado um snapshot novo, preservar a versão anterior e indicar diferenças; dado acesso negado, não expor nomes de casos proibidos; dado apenas metadados, exibir “documentação pendente”.

### RF02 — Gestão documental real

Receber processo integral e peças avulsas. Guardar arquivo original, hash, nome, tipo, versão, origem, data de obtenção, permissões, quantidade real de páginas e usuário responsável. Validar formato/tamanho, documentos corrompidos, proteção por senha e necessidade de OCR. Arquivos nunca entram automaticamente como instruções executáveis.

Mapear peça → arquivo → intervalo de páginas e distinguir página do PDF de folha processual. Identificar documentos citados mas não recebidos. Permitir complemento manual autorizado e substituição por nova versão sem apagar a anterior.

Aceite: um PDF idêntico enviado duas vezes não cria duas fontes independentes; documento ausente não vira “sem irregularidade”; nome de arquivo não é prova de conteúdo; contagem de páginas vem do arquivo recebido e não de uma ficha demonstrativa.

## 3. Base de evidências e motores

### RF03 — Classificação em dois níveis

Nível documental: petição inicial, contestação, laudo, parecer do assistente, contrato, decisão, comprovante, mídia etc.

Nível de afirmação: constatação documental, alegação atribuída, inferência analítica e conclusão/revisão humana. Acrescentar situação de contestação e grau de suporte, sem confundir natureza com confiabilidade. “A parte alegou X” pode ser constatação de uma petição; “X ocorreu” permanece alegação até suporte adequado.

Registro mínimo da afirmação: texto, natureza, autor da afirmação, sujeito referido, documento/página/trecho, data pertinente, evidências favoráveis e contrárias, confiança de extração, estado de revisão e responsável. Inferência exige premissas referenciadas. Revisão humana não transforma automaticamente um fato controvertido em verdade judicial.

Aceite: uma petição com alegação sem suporte é rotulada como alegação; inferência sem premissas não pode ser promovida a achado validado; correção preserva antes/depois e autoria.

### RF04 — Nulidade360 como motor especializado

Preservar auditoria por blocos/pilares, mapa de evidências, análise de prejuízo/nexo e revisão. O adaptador recebe caso, posição explicitamente confirmada, documentos e referências; devolve achados, scores, fontes, limitações e status de execução. Não aceitar o padrão “Polo Passivo” como substituto de confirmação.

Normalizar os resultados sem apagar o original. Um achado mantém identidade do motor e versão, execução, modelo/prompt, documentos analisados, evidências, fundamento, hipótese de consequência jurídica, força de suporte e pendências. “Análise parcial” deve continuar parcial na Evidia.

Aceite: falha em um bloco não produz parecer integral concluído; versão nova do laudo invalida a atualidade do resultado antigo; score aparece como índice de risco, separado de estimativa de êxito. Conferir resultados do adaptador contra a saída original em conjunto de casos autorizado.

### RF05 — Reutilização do P4 e Red Team

P4 contribui para mapa de evidências, geração de quesitos e respostas técnicas. A sua configuração atual é voltada a ERP/Tecnologia; ampliar domínio exige revisão dos prompts e testes por especialidade.

O adaptador deve preservar páginas, quesitos, respostas, status e justificativas, resolver divergências de campos entre função e prompt e registrar a versão. A decisão de expor P4 por API ou por execução controlada de job depende de validação técnica; esta especificação não afirma que ele já ofereça um microserviço HTTP.

### RF06 — Contraditório bilateral explícito

Entradas: versão do dossiê, participantes com papéis, pedidos individualizados, tese em teste, cenário do autor e cenário do réu. Se houver múltiplos autores/réus, reconvenção ou mudança de polo, simular por participante e pedido, sem reduzir tudo a dois nomes.

Executar cenários independentes sobre a mesma base:

1. Defender o autor: fundamentos, suporte, fragilidades e resposta aos argumentos do réu.
2. Defender o réu: fundamentos, suporte, fragilidades e resposta aos argumentos do autor.
3. Comparar: pontos comuns, controvérsias, documentos faltantes, premissas incompatíveis e risco residual.

Cada argumento informa quem o formula, contra quem, pedido/ato afetado, fonte, hipótese, contraprova, mitigação, confiança e pendências. Não produzir fatos novos para completar narrativa. Relatórios dos dois lados não podem compartilhar conclusões geradas como se fossem fatos de origem.

Aceite: trocar a posição econômica não altera fontes nem inverte automaticamente sinais; recalcula o efeito conforme o contrato. Um cenário não executado fica indisponível; ausência de ataque não significa êxito de 100%. Argumento adversarial sem evidência fica como hipótese para validação.

## 4. Novo módulo: diligência de vínculos e qualificação técnica

### Objetivo

Identificar informações pertinentes que possam afetar a confiabilidade da prova, a qualificação profissional, a estratégia processual e a negociação do ativo. A saída é um dossiê de diligência verificável. Não produzir um ranking de reputação pessoal nem buscar fatos irrelevantes para constranger envolvidos.

### RF07 — Cadastro de participantes e resolução de identidade

Extrair e confirmar: perito do juízo, assistentes de cada parte, advogados/OAB-UF, magistrados, partes e pessoas jurídicas. A mesma pessoa pode exercer papéis diferentes em processos diferentes; guardar papel, processo e período na relação, não só na pessoa.

CPF/CNPJ, OAB-UF e registro profissional são chaves de apoio quando legitimamente disponíveis; nome isolado gera candidato. Usar combinações verificáveis de identificadores, tribunal, localidade, especialidade e documento. Não mesclar homônimos automaticamente. Separar confiança de identidade, confiabilidade da fonte e relevância jurídica.

### RF08 — Janela temporal de cinco anos

Proposta: data final igual à data de referência da diligência e data inicial cinco anos antes. Em 16/11/2026: 16/11/2021 a 16/11/2026. Guardar ambas no relatório.

Incluir eventos de atuação/nomeação/vínculo dentro da janela, mesmo quando o processo começou antes. Se a fonte só permite filtrar distribuição, registrar essa limitação; não alegar cobertura integral. Datas desconhecidas ficam em fila de revisão. Qualificação é confrontada com a data da atuação questionada; a situação atual aparece separadamente. Documentos históricos anteriores podem contextualizar a habilitação, identificados como fora da janela de recorrência.

### RF09 — Cruzamentos solicitados

Executar para cada perito e assistente, em ambos os lados:

| Relação | Pergunta verificável | Evidência necessária |
|---|---|---|
| Profissional ↔ advogado | Em quais processos ambos atuaram no período? | Documento com os dois papéis, datas e CNJ |
| Profissional ↔ parte | Em quais processos o profissional atuou e a parte participou? | Papel de cada participante e referência |
| Profissional ↔ magistrado | Em quais processos houve atuação do profissional e atuação/decisão do magistrado? | Nomeação, decisão ou outro ato com data |
| Profissional ↔ atribuição | A atividade técnica está abrangida pelas atribuições verificadas na data? | Registro/certidão, atribuições e objeto do trabalho |
| Profissional ↔ procedimento disciplinar | Há procedimento ou decisão oficial pertinente à atividade? | Identidade, órgão, objeto, estado, data e decisão quando disponível |

Ocorrência no mesmo processo é coocorrência, não prova de amizade, contratação privada ou parcialidade. Recorrência deve mostrar contagem, universo efetivamente consultado, especialidade e concentração do mercado quando disponível. Sem denominador, não afirmar que a frequência é anormal.

### RF10 — Estratégia de fontes

1. **Autos e documentos já autorizados:** extrair identidades, nomeações, laudos, procurações e referências. Menor custo e maior contexto.
2. **Histórico processual:** consultar fornecedor contratado e fontes dos tribunais; buscar pelo profissional e cruzar com advogados, partes e magistrados. Quando o profissional não estiver indexado como envolvido, pesquisar atos/publicações e documentos dos processos candidatos, com cobertura declarada.
3. **Registros profissionais e decisões oficiais:** Confea/Crea e outros conselhos conforme especialidade. Verificar registro, atribuições, eventuais extensões, restrições e período. O título “engenheiro mecânico” isoladamente não encerra o exame de atribuições.
4. **Fontes públicas complementares:** publicações institucionais, currículos, vínculos profissionais e registros societários pertinentes.
5. **Redes sociais públicas:** trilha complementar revisada, conforme decisão do usuário. No primeiro incremento, permitir anexação de referência/material público pertinente com URL, autoria atribuída, data, contexto e revisão obrigatória antes de promover a achado validado. Busca automatizada não é requisito inicial. Ausência desse material não bloqueia a diligência principal. Não contornar login, privacidade ou restrições de acesso; não usar reconhecimento facial para identificar pessoas.

Datajud é útil para metadados; não foi escolhido como fonte única de participantes, autos ou vínculos. Escavador é candidato por já existir no ecossistema; cobertura de peritos, documentos, preço, limites e direitos de uso precisam ser comprovados no piloto. Não há promessa de API nacional única para processos disciplinares ou redes sociais.

Para dados pessoais, definir finalidade, base legal aplicável e necessidade por categoria; dado público não elimina essas obrigações. Avaliar retenção e acesso com o responsável jurídico/privacidade. Fontes externas são dados potencialmente hostis, nunca instruções para o agente.

### RF11 — Análise de relevância, validação e contraprova

Estados: candidato → identidade pendente/confirmada → evidência coletada → em revisão → validado ou descartado → encaminhado à avaliação jurídica. Permitir inconclusivo e contestado em todas as fases pertinentes.

Cada ocorrência contém: entidade, papel, relação alegada, fonte original, trecho/localização, data do fato e da coleta, hash do material preservado, forma de acesso, cobertura, evidência contrária, interpretação, hipótese alternativa, responsável e consequência a avaliar. Hash verifica integridade da cópia, não autenticidade ou verdade do conteúdo.

Uma fotografia conjunta pode ser evento profissional, publicação republicada ou identificação incorreta. Não concluir amizade íntima ou parcialidade com base nela. Notícia de denúncia não significa condenação; guardar estado e resultado. Perito judicial e assistente técnico recebem regras distintas: no CPC, o assistente é de confiança da parte e não se sujeita a impedimento/suspeição pelo mesmo regime. Vínculo esperado com a parte não deve gerar alerta de nulidade por si só.

A revisão jurídica deve indicar ato/prova afetado, fundamento aplicável, prejuízo, nexo, tempestividade/preclusão e providência possível, distinguindo esclarecimento, impugnação, substituição, nova perícia e eventual nulidade. Não concluir anulação integral do processo como consequência automática.

### RF12 — Saídas para negociação

Ficha por ocorrência, tabela de vínculos, cronologia e dossiê exportável. Cada item indica “o que foi encontrado”, “o que isso permite afirmar”, “o que não permite afirmar”, “o que falta verificar” e “possível impacto se confirmado”. Material não validado não entra como acusação nem como desconto automático no preço.

Aceites essenciais:

- Dois homônimos ficam separados quando não há identificador suficiente.
- Evento fora da janela não entra na estatística dos cinco anos.
- Processo anterior com nomeação dentro da janela entra com a data correta.
- Várias aparições do perito com o mesmo juiz são apresentadas como recorrência, sem conclusão automática de suspeição.
- Assistente contratado pela parte não recebe alerta apenas por essa relação.
- Registro atual não prova habilitação na data do laudo; lacuna histórica é visível.
- Procedimento arquivado não aparece como sanção vigente.
- Fonte indisponível produz “não foi possível consultar”, não “nenhum vínculo”.
- Toda conclusão revisada pode ser reaberta com contraprova e histórico preservado.

## 5. Avaliação econômica explicável

### RF13 — Avaliações separadas; contrato posterior

Decisão confirmada: avaliar recebimento do autor e redução de passivo do réu em demonstrativos independentes. No autor, apresentar recebimento bruto potencial, riscos, custos, prazos e valor líquido esperado. No réu, apresentar exposição de referência, desembolso esperado por cenário, custos de defesa/estratégia e redução de passivo em relação à referência explicitada. Não presumir contrato de serviço, financiamento ou aquisição.

Ausência de contrato não bloqueia essas avaliações. Manter preço de aquisição, participação contratual, remuneração e retorno do investidor como “não definido”, sem substituir por zero. Definir o contrato depois, com nova versão vinculada aos cenários de origem. Não subtrair mecanicamente a avaliação do autor de um valor nominal para obter a do réu.

### RF14 — Memória de cálculo navegável

Todo valor relevante abre detalhamento em tela inteira, `100vw × 100vh`, com `← Voltar` no topo. Estrutura:

1. Valor, significado, moeda, data-base, cenário, posição e versão.
2. Fórmula e substituição pelos números usados.
3. Componentes: origem, unidade, responsável, confiança e data.
4. Ajustes positivos/negativos e sua justificativa.
5. Achados técnicos/jurídicos que motivaram ajustes, com evidências e revisão.
6. Sensibilidade: efeito de mudar uma premissa, mantendo as demais constantes.
7. Limitações, campos ausentes e trilha de aprovação.

Cada impacto possui identificador e grupo de dependência para evitar dupla contagem entre nulidade, fragilidade probatória e risco adversarial. Mostrar se o efeito incide em probabilidade, valor, custo, prazo ou condição contratual. Não somar probabilidades de eventos dependentes como se fossem independentes.

Modelo conceitual proposto para recebíveis: valor esperado líquido presente = soma de cenários mutuamente exclusivos ponderados por probabilidades aprovadas, com recebimentos e custos descontados nas suas datas. Preço-limite deriva dos direitos efetivamente adquiridos e da política de retorno. Não usar score/100 como probabilidade por padrão. Estimativas humanas e heurísticas devem estar rotuladas; sem estimativa defensável, exibir intervalo/sensibilidade, não precisão artificial.

Exemplo didático, sem recomendação financeira: recebimento condicional de R$ 1.000.000 em dois anos; hipótese aprovada de 60% de recebimento e 40% de zero; desconto de 15% a.a.; custo certo de R$ 50.000 hoje. Valor líquido presente = 0,60 × 1.000.000 / 1,15² − 50.000 = aproximadamente R$ 403.686,20. Isso não é automaticamente o preço oferecido: a política de retorno e os direitos contratados ainda precisam ser aplicados.

Para o réu, nesta fase apresentar economia estimada do cliente, exposição residual, custos e prazos. Quando o instrumento for definido, acrescentar fluxo econômico contratual, parcela da Evidia/fundo e risco de recebimento. Manter a economia do cliente separada da receita do investidor.

Aceite específico da decisão D1: sem contrato, gerar os dois demonstrativos e mostrar campos contratuais como não definidos; definir contrato posteriormente preserva os cenários anteriores. A redução de passivo usa referência, data-base, custos e premissas visíveis, não é registrada como receita da Evidia.

Aceite: abrir qualquer valor permite reproduzi-lo; cálculos de resumo e detalhe usam a mesma versão; documento novo marca cálculo como desatualizado; falta de premissa obrigatória impede “preço aprovado”; cenário sem análise adversarial não assume 100% de êxito; arredondamento e unidades são consistentes; custo/prazo e dependências aparecem.

## 6. Navegação e tabelas

### RF15 — Etapas como navegação principal

Preservar o caso ativo ao mudar de etapa, com cabeçalho mostrando CNJ, parte/posição e estado dos dados. Módulos técnicos ficam como ferramentas internas de cada etapa. URLs antigas devem redirecionar para a etapa correspondente quando viável. Voltar do detalhe restaura filtros, paginação, seleção e rolagem.

### RF16 — Configuração de colunas

Usuário pode exibir/ocultar, reordenar e ajustar largura, salvar visões por tabela e restaurar padrão. Identificadores mínimos ficam sempre acessíveis. Preferências por usuário não ampliam permissões: coluna proibida não pode ser recuperada via exportação ou API.

### RF17 — Filtros incrementais e ordenação

Cada coluna adequada oferece busca incremental e seleção de múltiplos valores. Dentro de uma coluna, valores selecionados combinam por OU; entre colunas, por E. Opções disponíveis refletem filtros das outras colunas e mantêm valores já selecionados visíveis. Disponibilizar operadores por tipo: contém/exato, intervalo numérico/data e vazio/não vazio.

Ordenar ascendente/descendente por qualquer coluna de dados ordenável, com tipo correto, nulos em posição definida e identificador como desempate estável. Cabeçalhos de ações não são colunas ordenáveis. Não ordenar só a página atual quando o conjunto é paginado no servidor.

### RF18 — Seleção de registros

Checkbox por linha; selecionar página e selecionar todos os resultados filtrados são ações distintas e exibem contagens. Seleção usa IDs estáveis. Ao mudar filtro, informar quantos selecionados ficaram fora da visão e oferecer manter/limpar. Uma ação em massa mostra quantidade, escopo e prévia; ações destrutivas exigem confirmação explícita.

### RF19 — Layout e acessibilidade

Detalhes densos sempre em tela inteira com `← Voltar`. Tabela com altura limitada a `calc(100vh - 240px)`, cabeçalho sticky e rolagem horizontal acessível continuamente na parte inferior da janela; barra superior sincronizada quando aplicável. Ajuda/filtros usam portal no body ou posição fixa calculada, z-index 9999 e ajuste de borda; não recortar dentro de overflow. Garantir navegação por teclado, foco visível, rótulos e contraste.

Aceite: filtros e seleção funcionam juntos em duas páginas; ordenar números não usa ordem alfabética; seleção não muda de identidade após ordenar; visão reaparece ao entrar novamente; tabela larga pode rolar horizontalmente sem chegar ao último registro; ajuda perto da borda permanece visível; voltar do detalhe não perde contexto.

## 7. Arquitetura e contratos propostos

Evidia mantém a interface e ganha backend de orquestração/persistência. Originação é fonte externa; Nulidade360 e P4 são executores especializados por adaptadores. O novo módulo compartilha o repositório de evidências, identidades e revisão. Evitar nova duplicação de motores e cópia de regras financeiras no frontend.

Entidades: Processo, Participante, PapelNoProcesso, Oportunidade, PosiçãoEconômica, SnapshotOriginação, DocumentoVersão, Afirmação, Evidência, RelaçãoCandidata, Achado, Revisão, ExecuçãoMotor, CenárioAdversarial, PremissaEconômica, ExecuçãoCálculo e Decisão.

Envelope mínimo de execução: organização/caso, versão do dossiê, entrada e hash, serviço/modelo/prompt/versão, posição simulada, datas, status, tentativas, custo/uso quando disponível, saída validada, limitações e request_id. Adaptador deve normalizar sem ocultar original.

Jobs assíncronos: fila, executando, parcial, concluído, falhou e cancelado; retomada idempotente, timeout, retry limitado com backoff e controle de custo. Falha de provedor não invalida leitura dos resultados anteriores nem autoriza fallback fictício. Modo mock separado e identificado. Nenhuma credencial no navegador.

Trilha com Loguru e eventos JSONL sanitizados: ação, alvo, resultado, timestamp, ator, correlation_id e evidências da etapa. Guardar prompts/contexto/respostas de modo conferível e com acesso restrito, conforme a política do PRD. Versionar regras e manter reprodutibilidade determinística dos cálculos.

## 8. Plano de validação e critérios de liberação

| Camada | Cenário mínimo | Evidência esperada |
|---|---|---|
| Contrato de originação | Permissão negada, snapshot repetido, CNJ ausente, estudo sem autos | Mapeamento correto, ausência de duplicação e lacuna explícita |
| Documentos | PDF repetido, corrompido, escaneado, peça faltante | Hash, tratamento de erro, OCR indicado e inventário correto |
| Nulidade/P4 | Saída válida, parcial, campo divergente, timeout | Adaptador preserva status/fontes e não inventa sucesso |
| IA jurídica | Alegação sem prova, contraprova, dois polos, múltiplas partes | Especialista avalia fidelidade, fontes e separação dos cenários |
| Identidade/vínculos | Homônimos, papel distinto, evento antigo, denúncia arquivada | Nenhuma fusão ou acusação automática |
| Econômico | Ausência de análise, inversão de posição, ajuste duplicado, preço zero | Bloqueios corretos, cálculo reproduzível e limites explícitos |
| Interface | Colunas, filtros E/OU, seleção entre páginas, detalhe/retorno | Jornada completa, acesso por teclado e estado preservado |
| Segurança | Casos de outra organização, arquivo malicioso, prompt injetado | Acesso negado, isolamento e instruções externas ignoradas |

Construir amostra anotada por especialista, incluindo casos negativos e inconclusivos. Medir precisão de identidade, rastreabilidade de citações, falsos positivos de vínculos, cobertura e tempo/custo. Metas quantitativas de precisão e latência devem ser aprovadas após baseline; não declarar homologação apenas por testes de software.

Condição de liberação: contratos e permissões testados; fontes críticas verificadas; revisão bilateral concluída; metodologia econômica aprovada; critérios de interface cumpridos; ausência de falhas essenciais de QA; decisão explícita de publicação. Não há aprovação de deploy nesta entrega.
