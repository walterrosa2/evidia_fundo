# PRD — Evolução da Evidia e diligência de vínculos

Versão documental: 0.3 — 16/11/2026. Status: proposta para refinamento com D1 e D2 confirmadas pelo usuário; não é especificação integralmente homologada nem release de software.

## Objetivo e usuários

Permitir que analistas, especialistas jurídico-periciais, negociadores e comitê de investimento selecionem um processo, entendam a qualidade das evidências, confrontem os dois lados e avaliem os impactos econômicos com agilidade e rastreabilidade.

## Problema

A versão local apresenta uma jornada útil, porém usa resultados preparados e fluxos demonstrativos. A nova versão precisa transformar essa jornada em operação persistente, integrar a originação e motores existentes e tornar explícitos origem, incerteza, posição processual e composição dos valores.

## Escopo proposto

1. Entrada por seleção da originação ou envio complementar de documentos.
2. Dossiê persistente, versionado, com tipos documentais e afirmações classificadas.
3. Reutilização do Nulidade360 e do P4 mediante contratos e adaptadores.
4. Red Team com cenários do autor e do réu.
5. Novo módulo de diligência de vínculos e qualificação técnico-profissional.
6. Avaliações explicáveis e separadas de recebimento do autor e redução de passivo do réu. Contrato, remuneração e retorno do investidor ficam para definição posterior.
7. Navegação por etapas e tabelas personalizáveis.

## Restrições

- Não alterar o funcionamento do originacao-pipeline nesta versão; adaptar a entrada da Evidia.
- Não presumir autos completos a partir de metadados ou de relatórios de estudo.
- Não transformar score heurístico em probabilidade estatística sem validação.
- Não inferir nulidade, parcialidade ou irregularidade apenas de recorrência processual, fotografia, título acadêmico ou notícia de denúncia.
- A entrega documental 0.3 não implementava software; a implementação incremental começou em 2026-11-16 (ver “Estado da implementação”).

## Fora do escopo inicial recomendado

Rastreamento indiscriminado de vida privada; acesso a contas fechadas; reconhecimento facial; aquisição de dados vazados; busca de informações irrelevantes ao processo; decisão jurídica ou compra automática; alteração da originação; treinamento de modelos com dados pessoais dos casos sem governança específica.

## Dados e segurança

O processo pode conter CPF, contatos, documentos de identidade, informações financeiras, dados sensíveis e segredo de justiça. Aplicar controle por organização/caso/papel, minimização, criptografia, trilha de acesso, prazo de retenção e correção. CPF deve aparecer mascarado e ser usado integralmente apenas por operação autorizada. Logs gerais não devem conter autos, segredos ou dados pessoais brutos. Prompts, contextos e respostas necessários à conferência devem ter versão sanitizada; o conteúdo integral, quando justificado, fica em repositório restrito vinculado à execução.

## Resultados esperados e metas propostas

- Todo achado revisável ligado à fonte, ao trecho e à execução que o produziu.
- Toda importação repetida reconhecida sem duplicação do mesmo ativo/posição.
- Todos os valores relevantes com memória de cálculo, premissas e aprovação.
- Nenhuma ausência de análise convertida automaticamente em risco zero ou êxito de 100%.
- Nenhuma correspondência por nome isolado promovida automaticamente a identidade confirmada.
- Usuário retoma caso, filtros e tabela ao voltar do detalhamento.
- Meta de usabilidade a homologar: localizar um achado e abrir sua origem em até três ações a partir do resumo do caso.

## Decisões confirmadas pelo usuário

D1 — Confirmada em 16/11/2026. Avaliar recebimento do autor e redução de passivo do réu separadamente; definir o contrato depois. A avaliação dos dois lados pode avançar sem contrato. Preço de aquisição, remuneração contratual e retorno do investidor dependem da definição futura do instrumento, sem valores presumidos.

D2 — Confirmada em 16/11/2026. Priorizar processos e registros profissionais. Redes sociais públicas ficam como evidência complementar revisada, sem condicionar a conclusão da diligência principal à existência de conteúdo nessas fontes. Busca automatizada em redes sociais não é requisito do primeiro incremento.

## Decisões ainda necessárias

D3. Escolher tribunais/segmentos do piloto, volume, orçamento por diligência, fornecedor contratado, responsáveis por revisão jurídica e metodologia econômica. Verificar cobertura e permissões com dados autorizados antes de estimar prazo de implantação.

## Documentos de apoio

- Constituição: `.specify/memory/constitution.md` 1.0.0.
- Especificação: `specs/001-evidia-operacional/spec.md` e `refinamento.md` (0.3).
- Diagnóstico: `specs/001-evidia-operacional/diagnostico.md`.
- Plano e tarefas: `specs/001-evidia-operacional/plan.md` e `tasks.md`.
- Prompt de desenvolvimento: `docs/desenvolvimento/PROMPT_CLAUDE_CODE.md`.

## Estado deste ciclo

Estrutura inicial do Spec Kit criada por autorização do usuário em 2026-11-16. Não havia
constitution.md nem templates. D1/D2 preservadas. D3 e decisões técnicas D4–D7 constam do
refinamento, com tarefas afetadas delimitadas. Nenhum código funcional foi alterado.

## Estado da implementação (2026-11-16, incremento 1)

Escopo inalterado. Primeira jornada operacional local entregue: entrada pela originação
(adaptador somente-leitura, exercitado com fixture sintética), snapshot versionado, dossiê
documental, afirmações com revisão e motor dos dois demonstrativos sem contrato.
D4 fechada (API FastAPI ao lado do frontend SSR). D3, D5, D6 e D7 continuam pendentes e
delimitam a homologação: nada desta entrega é integração real validada, metodologia
aprovada ou produto pronto para produção. Dados pessoais reais não foram utilizados.
Detalhes: `Walkthrough.md`, `specs/001-evidia-operacional/tasks.md` e `adr/decisoes.md`.

### Incremento 2 (2026-11-16)

Escopo inalterado. Entregues, de forma parcial: a tabela comum na lista de oportunidades
(RF16–RF18, com AC17 e AC19 testados no servidor) e a tela dos demonstrativos com memória de
cálculo em tela inteira e exportação (RF13–RF14). Continuam fora: sensibilidade, vínculo dos
valores com achados, política de colunas por papel (D5) e homologação da metodologia (D7).
Os valores exibidos decorrem apenas de premissas digitadas; não são preço nem recomendação.

### Incremento 3 (2026-11-17)

Escopo inalterado. A tabela comum (RF16–RF18) passou a valer também para documentos e
afirmações do dossiê, restrita à oportunidade aberta e com a mesma autorização no servidor.
Continuam fora: arrasto de colunas, ações em massa, política de colunas por papel (D5) e tudo
o que depende de D3, D7 e dos módulos externos.

### Incrementos 4 e 5 (2026-11-17)

Escopo inalterado. Contratos de motor e contraditório materializados (RF04–RF06) e adaptador
do Nulidade360 funcionando **em modo simulado**, sem consumo de API paga e sem alterar o
Nulidade360. Dados pessoais reais não foram utilizados: só texto sintético saiu da Evidia. A
análise real permanece desabilitada e depende de autorização de custo e de caso.

### Incrementos 6 a 13 (2026-11-17)

Escopo inalterado; nenhuma decisão nova foi tomada em nome do usuário. Entraram: revisão de
achados, texto e OCR local, diligência de vínculos com conector sintético, contraditório
bilateral, importação do relatório do P4, impactos econômicos com grupo de dependência,
sensibilidade, memorando versionado com decisão de responsável, navegação pelas seis etapas e
relatórios derivados da originação.

Continua valendo: motores só em modo simulado ou por importação, sem consumo de API paga;
dados sintéticos rotulados; metodologia econômica **não homologada** (D7); contrato não
definido (D1); sem fonte real de diligência nem originação real (D3); política de colunas por
papel e segregação de quem aprova memorando pendentes de D5; volume alto pendente de D6. Dados
pessoais reais não foram usados. O sistema não está pronto para produção.

### Incremento 14 (2026-11-17)

Escopo inalterado. Fechado o que não depende de IA paga nem de dado real: mapa de evidências
e relatório do Nulidade360 em modo simulado, pedido de execução do P4 com texto de entrada,
resultado de diligência em fonte real por planilha, política padrão de colunas por papel e
medição de volume.

Padrões adotados nesta rodada, a confirmar pelo usuário: o papel de leitura não vê
identificador na origem, hash nem nome de arquivo (D5); memorando pode ser aprovado por quem o
emitiu, com opção de exigir outra pessoa (D5); capacidade medida de 100 mil registros por
tabela (D6). D3 e D7 seguem sem decisão. O piloto real está descrito em
`docs/desenvolvimento/PILOTO.md` e não foi executado; o sistema não está pronto para produção.
