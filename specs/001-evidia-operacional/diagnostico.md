# Evidia — diagnóstico da versão local

Data: 16/11/2026. Estado: refinamento e especificação; nenhuma implementação solicitada ou realizada nesta entrega.

## 1. Escopo e grau de comprovação

Inspeção estática do código, dos prompts e dos registros de continuidade. Não foram iniciados serviços, executadas análises de casos, consumidas APIs pagas ou verificadas versões em produção. As conclusões sobre comportamento referem-se à cópia local indicada pelo usuário.

Raízes examinadas:

| Sigla | Pasta | Identificação Git local |
|---|---|---|
| E | `C:\Users\walte\OneDrive\Workspace\IA\Cruvinel\Projetos_MVP\Projetos\Plataforma fundos\blueprint-builder-biz-main` | main, 5f3a45d, origin https://github.com/walterrosa2/evidia_fundo.git |
| N | `C:\Users\walte\OneDrive\Workspace\IA\Cruvinel\Projetos_MVP\Projetos\Dados_Projeto_App_Nulidade` | Sem repositório identificado; não inicializado |
| P | `E:\HD_EXTERNO\Cruvinel_dados\Projeto Evidencias e Provas\P4` | main, 4b4caaa, origin https://github.com/EvidJurii/Evid_Evidencias_Provas.git |
| O | `C:\Users\walte\OneDrive\Workspace\IA\Cruvinel\Projetos_MVP\Projetos\originacao-pipeline` | main, c81d41c, origin https://github.com/EvidJurii/evid_originacao_pipeline |

Os commits identificam a base, não certificam sincronização remota nem implantação. README não foi tratado como prova de execução. O README da originação descreve uma arquitetura anterior; o código atual contém API autenticada e frontend React.

## 2. Respostas às dúvidas

### Entrada do ativo: como busca os documentos?

Nos fluxos examinados, a Evidia não busca automaticamente autos, laudos, contratos ou petições. A tela “Como funciona” descreve a jornada pretendida em `E/src/data/pipelineDemo.ts`. A nova análise é uma sequência demonstrativa: `E/src/routes/nulidade360.nova-analise.tsx` informa “upload simulado”; o processamento em `nulidade360.processamento.tsx` avança por temporizador.

O componente `E/src/components/cases/CaseDocumentViewer.tsx` abre um PDF selecionado com `URL.createObjectURL`. Isso permite visualização local, mas não persiste nem envia esse PDF a um motor. Sem PDF, mostra uma prévia demonstrativa. Portanto, não comprova ingestão, OCR, classificação ou obtenção integral do processo.

Há conteúdo preparado a partir de relatórios anteriores, e não apenas exemplos inventados: `E/src/data/v2/nullityReports.ts` declara origem em pareceres Word; `evidenceDossier.ts` declara origem em planilha do P4. A presença desses dados não transforma a interface em uma integração operacional.

### Etapa 3: classificar fatos, alegações e inferências ou manter Nulidade360?

São responsabilidades complementares. O tipo do documento — laudo, contrato, petição — é uma classificação. A natureza de uma afirmação dentro dele — constatação documental, alegação ou inferência — é outra. Uma única petição pode conter todas elas.

O Nulidade360 existente é substancialmente mais especializado que a frase da tela: `N/src/core/orchestrator.py` percorre blocos, usa contexto da parte representada e posição processual, recebe mapa de evidências, registra versões e falhas parciais. `schemas.py` contempla evidência, inferência, fundamento jurídico, prejuízo, nexo causal e documentos faltantes. `main.py` tem criação de caso com arquivo, importação de mapa e disparo de análise.

Recomendação: manter Nulidade360 como motor de auditoria jurídico-pericial, precedido por uma base comum de documentos e afirmações rastreáveis. Não duplicar a auditoria dentro da Evidia. Criar um adaptador e homologar o contrato antes de anunciar integração.

O score de `N/src/core/risk_engine.py` é uma regra ponderada. Combina fatores de risco, evidência, status, preclusão, estratégia, confiança e pilares; depois usa 70% da média dos scores positivos e 30% do maior, com ajuste adicional para múltiplos achados críticos. Não há, nesta inspeção, comprovação de calibração estatística que autorize apresentar esse score como probabilidade de anulação.

### Etapa 4: usa P4 ou motor próprio?

No fluxo local examinado, não encontrei execução online de P4 nem motor próprio de geração adversarial. A rota `E/src/routes/red-team.tsx` carrega `getRedTeamData` de `mockRedTeam.ts` e o dossiê estático de `evidenceDossier.ts`.

Existe reaproveitamento offline: `E/scripts/gerar_evidencias_ts.py` converte `relatorio_final.xlsx` em dados TypeScript. Seu caminho de entrada aponta para uma antiga pasta `E:\Backup_HD_Walter\...\P4`, diferente da pasta atual informada. O cabeçalho de `nullityReports.ts` também cita um gerador `scripts/gerar_nulidade.py`, não encontrado nesse local. A regeneração precisa ser verificada antes de ser considerada reproduzível.

No P4, `resposta_simulator.py` chama `run_prompt` para responder quesitos a partir de evidências. O prompt `prompts/prompt_etapa_respostas.txt` orienta um analista técnico-forense de ERP/Tecnologia, com linguagem defensiva. Isso é suporte técnico a quesitos, não equivale por si só a um Red Team jurídico completo e bilateral.

### Como a parte adversária é escolhida hoje?

Nos dados da Evidia, `attackingSide` já vem preenchido como `claimant` ou `defendant`; a tela apenas o apresenta. O dossiê importado do P4 descreve respostas simuladas da ré aos quesitos da autora. Não foi encontrado nesse fluxo um mecanismo que detecte autonomamente a posição adquirida.

Há assimetria material: `E/src/lib/valuationModel.ts`, em `computeAdversarialRisk`, filtra somente ataques `defendant`. Se não há esses ataques, retorna risco zero; `deriveValuation` calcula o complemento como probabilidade de êxito, chegando a 100% no cenário base. Ausência de análise não deve virar certeza de êxito na versão operacional.

Recomendação: executar dois cenários explícitos — tese do autor e tese do réu — e registrar separadamente a posição econômica analisada. A avaliação jurídica bilateral pode existir antes da escolha de investimento; preço recomendado exige definir o instrumento e seus fluxos econômicos.

### Etapa 5: o racional já existe?

Existe cálculo determinístico e parcialmente explicado em `E/src/lib/valuationModel.ts`. Pontos observados:

- Valor atualizado entra como potencial econômico; preço-base = 10% desse valor.
- Recuperação = score probatório/100 × (1 − risco de nulidade/200).
- Risco adversarial = média das probabilidades dos ataques da defesa, com pesos por severidade.
- Probabilidade exibida = 1 − risco adversarial.
- Ajustes sobre preço-base: evidência (sensibilidade 0,5), nulidade (0,4), adversarial (0,3), acordo (0,15) e divergência técnica (0,2).
- Cenários aplicam intensidades 1,35; 1; 0,7. O múltiplo divide valor ajustado a risco pelo preço recomendado.

Esses coeficientes estão no código; não foi encontrada nesta inspeção justificativa de calibração econômica para tratá-los como universais. A mesma fragilidade pode entrar em mais de um indicador: a nova versão deve revelar essa dependência e evitar dupla contagem. No modelo examinado, a fórmula de recuperação e preço não representa explicitamente todos os custos e o valor temporal do dinheiro.

A tela “Como funciona” ainda tem números demonstrativos e relações próprias de preço/ROI em `pipelineDemo.ts`. A nova versão deve usar uma única execução versionada de cálculo em todas as telas.

### Navegação por etapas e tabelas

A proposta de usar as etapas como navegação principal é coerente com a jornada. O conteúdo de `pipelineDemo.ts` oferece seis etapas aproveitáveis. Os nomes de módulos podem aparecer dentro das etapas, preservando atalhos e o caso ativo. As etapas não devem funcionar como bloqueio sequencial indiscriminado: documentação nova pode exigir voltar e reprocessar somente análises afetadas.

No Deal Flow examinado (`E/src/routes/deals.index.tsx`), há filtros predefinidos e busca, mas não foi identificada nessa tela a experiência completa solicitada de colunas configuráveis, filtros incrementais por coluna e seleção persistente. A especificação define um comportamento comum a todas as tabelas de registros, a ser inventariado na implementação.

### Originação: o que pode ser reutilizado sem alterar o módulo?

O código atual contém API `/api/v1`, autenticação, permissões, casos e estudos. Rotas existentes relevantes: `GET /api/v1/casos`, `GET /api/v1/casos/{caso_id}`, `GET /api/v1/analisados`, `GET /api/v1/processos/{cnj}/estudo` e relatórios PDF de estudo/dossiê. Fontes: `O/coletor/api/internal_api.py`, `routers/casos_router.py` e `routers/estudo_router.py`.

Um caso comercial e um processo CNJ não são necessariamente a mesma entidade. O esquema de caso contém `processo_cnj_principal`; o estudo é consultado por CNJ. Os PDFs de estudo/dossiê são relatórios gerados e não devem ser confundidos com cópia integral dos autos. A compatibilidade de todos os campos, permissões e documentos ainda precisa de teste de contrato.

Recomendação: manter o módulo intacto e desenvolver a importação do lado da Evidia. Se o contrato existente não fornecer um documento, registrar a lacuna e aceitar complemento autorizado; não escrever no banco da originação nem inventar disponibilidade.

## 3. Fontes externas verificadas em 16/11/2026

- [CPC atualizado, Câmara dos Deputados](https://www2.camara.leg.br/legin/fed/lei/2015/lei-13105-16-marco-2015-780273-normaatualizada-pl.html): distinguir perito judicial e assistente técnico; art. 466, §1º, afasta impedimento e suspeição do assistente de confiança da parte. Consequências jurídicas de achados exigem avaliação do caso.
- [CNJ — API pública Datajud](https://www.cnj.jus.br/sistemas/datajud/api-publica/): acesso a metadados; não assumir entrega de autos e dados completos de envolvidos.
- [Escavador — processos de envolvidos](https://api.escavador.com/v2/docs/consulta-de-processos-de-envolvidos): candidato para busca por identificadores, com atenção a homônimos e cobertura.
- [Escavador — atualização e documentos](https://api.escavador.com/v2/docs/atualizacao-de-processos): documentos públicos e autos sujeitos a condições de acesso e autenticação. Não houve teste com conta contratada.
- [Confea — consulta profissional](https://consultaprofissional.confea.org.br/): consulta informativa sem valor de certidão.
- [Confea — perguntas frequentes](https://www.confea.org.br/transparencia/perguntas-frequentes): atribuições devem ser verificadas com o Crea competente.
- [ANPD — guia de legítimo interesse](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse): finalidade, necessidade, balanceamento e salvaguardas; a hipótese legal aplicável precisa ser definida para cada tratamento.

## 4. Limitações e próxima validação

Não houve comprovação em produção, homologação jurídica, medição de precisão dos motores ou chamada real aos fornecedores. A próxima validação deve acompanhar um caso autorizado do cadastro até o cálculo, com documentos reais identificados, saída dos motores e confronto por especialista. Esse piloto deve incluir um ativo do autor e uma operação do réu, depois de definido o modelo econômico deste último.

## Complemento da inspeção no ciclo de constituição

Em 16/11/2026, CLAUDE.md e scripts/ confirmaram os geradores atuais `extrair_nulidade.py` e `gerar_nulidade_ts.py`. O nome `gerar_nulidade.py` citado no cabeçalho do dado gerado continua sendo referência desatualizada; a ausência daquele nome não significa ausência de gerador equivalente. A regeneração não foi executada. Foram encontrados planos V3 históricos com restrições de demo; foram delimitados para não reger o escopo operacional.
