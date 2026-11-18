"""Ajuda das colunas das tabelas comuns, no formato do guia editorial do projeto.

Cada coluna tem tres partes — o que e, como e calculado (ou de onde vem) e como ler — escritas
para o profissional que avalia o ativo para um fundo. O texto mora aqui, e nao na definicao
da coluna, para que toda a ajuda seja revista de uma vez quando a regra muda.

Regras do texto: terceira pessoa; nada de instrucao de navegacao; todo numero diz de onde vem;
o que e simulado, alegado ou nao homologado e dito como tal.
"""

from __future__ import annotations

H = tuple[str, str, str]


def build(what: str, how: str, read: str) -> str:
    """Tres linhas: o balao de ajuda quebra a linha em cada parte."""
    return f"O que é: {what}\nComo é calculado: {how}\nComo ler: {read}"


_CREATED: H = (
    "Momento em que o registro entrou no dossiê.",
    "Carimbo do servidor na gravação, exibido no fuso de Brasília.",
    "Serve para ordenar e auditar; não é a data do fato processual.",
)
_UPDATED: H = (
    "Momento da última alteração do registro.",
    "Carimbo do servidor a cada mudança, inclusive revisão.",
    "Data recente indica trabalho em curso; não indica mudança no processo judicial.",
)
_DOSSIER_VERSION: H = (
    "Versão do dossiê em que o registro foi produzido.",
    "Contador que avança a cada documento ou versão recebida.",
    "Número menor que o atual indica registro feito antes de mudança documental: conferir "
    "se continua válido.",
)
_CNJ: H = (
    "Número único do processo judicial.",
    "Vem da fonte do registro e é normalizado no formato do CNJ.",
    "É a chave para localizar o processo no tribunal; nome de parte não substitui o número.",
)

COLUMN_HELP: dict[str, dict[str, H]] = {
    "opportunities": {
        "cnj": (
            "Número único do processo judicial avaliado.",
            "Informado pela origem e validado pelo dígito verificador.",
            "Vazio indica rascunho: sem CNJ válido o caso não é ligado a outro por nome de parte.",
        ),
        "title": (
            "Título do caso como veio da origem.",
            "Copiado do registro importado, sem edição.",
            "Identifica o caso na lista; não descreve o mérito nem a posição avaliada.",
        ),
        "court": (
            "Tribunal em que o processo tramita.",
            "Derivado dos dígitos de segmento e tribunal do número CNJ.",
            "Vazio indica CNJ ausente ou inválido.",
        ),
        "position_side": (
            "Lado do processo cuja posição econômica é avaliada nesta oportunidade.",
            "Confirmado por quem importou o caso; não há valor presumido.",
            "Autor: avalia-se o recebimento. Réu: avalia-se a redução de passivo. O mesmo "
            "processo pode ter uma oportunidade para cada lado.",
        ),
        "represented_party": (
            "Parte do processo cuja posição é avaliada.",
            "Informada na importação, a partir das partes devolvidas pela origem.",
            "Define de quem são o risco e o resultado econômico apurados no dossiê.",
        ),
        "origin_system": (
            "Sistema de onde o caso foi importado.",
            "Registrado na importação.",
            "“Fixture sintética” indica dado de teste, que não representa processo real.",
        ),
        "origin_external_id": (
            "Identificador do caso no sistema de origem.",
            "Copiado da origem na importação.",
            "Permite reencontrar o registro na origem; não tem significado processual.",
        ),
        "process_status": (
            "Situação do cadastro do processo.",
            "Ativo quando há CNJ válido; rascunho quando não há.",
            "Rascunho bloqueia o parecer integral até o número ser corrigido.",
        ),
        "documents_count": (
            "Quantidade de documentos no dossiê.",
            "Contagem de documentos, sem somar versões antigas.",
            "Zero indica dossiê sem prova documental: nenhuma conclusão é sustentável.",
        ),
        "has_full_record": (
            "Indica se os autos integrais foram recebidos.",
            "Verdadeiro quando há documento da categoria “autos integrais”.",
            "Sem os autos o parecer integral fica bloqueado; relatório derivado não os substitui.",
        ),
        "open_gaps_count": (
            "Peças esperadas ou citadas e ainda não recebidas.",
            "Contagem das lacunas documentais em aberto.",
            "Cada lacuna é um ponto cego: ausência de documento não equivale a ausência de "
            "irregularidade.",
        ),
        "open_conflicts_count": (
            "Divergências de identidade entre importações do mesmo caso.",
            "Contagem de conflitos de CNJ ou de partes ainda não revisados.",
            "Qualquer valor acima de zero pede revisão antes de confiar na identificação do ativo.",
        ),
        "claims_count": (
            "Afirmações registradas no dossiê.",
            "Contagem de afirmações, em qualquer estado de revisão.",
            "Quantidade não mede qualidade: o que importa é quantas foram revisadas e têm "
            "página de origem.",
        ),
        "contract_status": (
            "Situação do contrato comercial do ativo.",
            "Permanece “não definido” nesta versão: o contrato é etapa posterior.",
            "Sem contrato, preço, retorno do investidor e remuneração não são calculados nem "
            "tratados como zero.",
        ),
        "dossier_version": (
            "Versão atual do dossiê.",
            "Contador que avança a cada documento ou versão recebida.",
            "Análises feitas em versão anterior ficam marcadas como desatualizadas.",
        ),
        "is_synthetic": (
            "Indica se o caso é dado de teste.",
            "Herdado da origem na importação.",
            "Dado sintético nunca fundamenta decisão; a marca acompanha o caso em tela e "
            "exportação.",
        ),
        "created_at": _CREATED,
        "updated_at": _UPDATED,
    },
    "documents": {
        "title": (
            "Nome dado ao documento no dossiê.",
            "Informado por quem enviou o arquivo.",
            "Identifica o documento entre versões; não substitui a leitura do conteúdo.",
        ),
        "doc_type": (
            "Tipo da peça: petição, contestação, laudo, contrato e outros.",
            "Informado no envio ou na classificação posterior.",
            "Indica quem fala no documento. Não define a natureza das afirmações que ele contém.",
        ),
        "category": (
            "Papel do documento como prova: autos integrais, peça, relatório derivado ou metadado.",
            "Informada no envio; relatórios da originação entram como derivados.",
            "Relatório derivado resume ou analisa: não é cópia dos autos e não libera o "
            "parecer integral.",
        ),
        "version_no": (
            "Número da versão do documento.",
            "Sequencial por documento, a cada novo arquivo enviado para ele.",
            "Versão maior não apaga a anterior: a anterior continua consultável.",
        ),
        "is_current": (
            "Indica se esta é a versão em vigor do documento.",
            "Vigente é a versão de maior número.",
            "Afirmações e análises feitas sobre versão substituída ficam desatualizadas.",
        ),
        "page_count": (
            "Quantidade de páginas do arquivo.",
            "Contagem real do arquivo recebido, feita na leitura.",
            "Vazio indica formato sem paginação conhecida; a citação por página fica limitada.",
        ),
        "state": (
            "Condição de leitura do arquivo.",
            "Definida na inspeção do arquivo recebido.",
            "“Precisa de OCR” indica documento digitalizado sem texto: não pode ser citado "
            "por trecho até a leitura.",
        ),
        "sha256": (
            "Impressão digital do arquivo recebido.",
            "Hash SHA-256 do conteúdo, calculado no recebimento.",
            "Prova que o arquivo não mudou desde o recebimento; não prova autenticidade nem "
            "verdade do conteúdo.",
        ),
        "obtained_at": (
            "Momento em que o arquivo foi recebido.",
            "Carimbo do servidor no envio.",
            "É a data de entrada no dossiê, não a data da peça no processo.",
        ),
        "size_bytes": (
            "Tamanho do arquivo.",
            "Medido em bytes no recebimento.",
            "Dado de conferência; arquivo muito pequeno para o tipo pode indicar peça incompleta.",
        ),
        "filename": (
            "Nome do arquivo como foi enviado.",
            "Copiado do envio.",
            "Ajuda a reconhecer a origem do arquivo; não é evidência do conteúdo.",
        ),
        "media_type": (
            "Formato do arquivo.",
            "Reconhecido pela extensão e conferido na leitura.",
            "PDF e texto permitem citação por página; imagem depende de OCR.",
        ),
        "origin": (
            "Como o arquivo entrou no dossiê.",
            "Registrado no recebimento: envio por pessoa ou importação da originação.",
            "Importado da originação é relatório gerado, não peça dos autos.",
        ),
    },
    "claims": {
        "text": (
            "Enunciado da afirmação registrada.",
            "Escrito por pessoa ou sugerido por regra ou modelo e aceito por pessoa.",
            "É o que se pretende sustentar; só tem valor com a página de origem e a revisão.",
        ),
        "nature": (
            "Tipo de enunciado: constatação documental, alegação atribuída, inferência "
            "analítica ou conclusão humana.",
            "Definida no registro; em peça de parte, o que o modelo sugere entra como alegação "
            "de quem assina.",
            "Alegação continua alegação por mais que se repita. A natureza não mede "
            "confiabilidade.",
        ),
        "asserted_by": (
            "Quem faz a afirmação no documento.",
            "Informado no registro: parte, perito, testemunha.",
            "Vazio em constatação documental; em alegação, mostra de quem é a versão dos fatos.",
        ),
        "document_title": (
            "Documento do dossiê de onde a afirmação foi tirada.",
            "Vínculo informado no registro e conferido contra o dossiê.",
            "Vazio indica afirmação sem citação resolvível: pendente de evidência.",
        ),
        "document_version_no": (
            "Versão do documento citada pela afirmação.",
            "Registrada no momento da citação.",
            "Diferente da versão vigente indica citação a conferir de novo.",
        ),
        "page_start": (
            "Página do arquivo em que está o trecho citado.",
            "Informada no registro e conferida contra a contagem real de páginas.",
            "É a página do arquivo, não a folha dos autos.",
        ),
        "review_state": (
            "Estado da revisão humana da afirmação.",
            "Alterado apenas por revisor, com histórico de antes e depois.",
            "“Validada” significa revisada por responsável, não verdade reconhecida em juízo.",
        ),
        "stale": (
            "Indica se a afirmação continua apoiada na versão vigente do documento.",
            "Marcada como desatualizada quando o documento citado recebe versão nova.",
            "Desatualizada não pode ser validada sem nova citação.",
        ),
        "dossier_version": _DOSSIER_VERSION,
        "created_at": _CREATED,
        "updated_at": _UPDATED,
    },
    "process_roles": {
        "participant": (
            "Pessoa ou empresa que atuou no processo.",
            "Cadastro do dossiê; homônimos ficam separados até revisão.",
            "Nome igual não prova que é a mesma pessoa: a identidade depende de identificador "
            "forte.",
        ),
        "role": (
            "Função exercida no processo: perito do juízo, assistente técnico, advogado, juiz, "
            "parte.",
            "Informada no registro ou trazida pela fonte consultada.",
            "Perito do juízo e assistente de parte têm regras de impedimento diferentes.",
        ),
        "side": (
            "Lado do processo a que a atuação se liga.",
            "Informado no registro ou pela fonte.",
            "Assistente técnico atuar com a parte que o indicou é relação esperada, não vínculo "
            "suspeito.",
        ),
        "cnj": _CNJ,
        "court": (
            "Tribunal do processo em que houve a atuação.",
            "Informado pela fonte ou derivado do número CNJ.",
            "Concentração em um tribunal ou vara é contexto, não prova de direcionamento.",
        ),
        "event_date": (
            "Data do ato do profissional: nomeação, entrega de laudo ou decisão.",
            "Informada pela fonte ou pelo documento citado.",
            "É a data usada na janela de cinco anos; não é a data de distribuição do processo.",
        ),
        "event_label": (
            "Descrição do ato registrado.",
            "Texto da fonte ou de quem registrou.",
            "Indica o que o profissional fez naquele processo.",
        ),
        "source_kind": (
            "De onde veio o registro da atuação.",
            "Documento do dossiê, consulta a fonte ou registro manual.",
            "Registro de fonte sintética é dado de teste.",
        ),
    },
    "occurrences": {
        "subject": (
            "Profissional a quem a ocorrência se refere.",
            "Participante do dossiê escolhido no registro.",
            "A ocorrência só é confiável com a identidade desse profissional confirmada.",
        ),
        "kind": (
            "Tipo de ocorrência: coocorrência em processo, qualificação, procedimento "
            "disciplinar, material social ou outro.",
            "Definido no registro.",
            "Material de rede social é complementar e depende de data e autoria confirmadas.",
        ),
        "state": (
            "Situação da ocorrência na revisão.",
            "Nasce candidata; só revisor a valida, descarta ou encaminha ao jurídico.",
            "Só ocorrência validada segue para avaliação jurídica. Vínculo isolado não gera "
            "nulidade.",
        ),
        "related": (
            "Pessoa ou empresa com quem o profissional aparece relacionado.",
            "Participante do dossiê escolhido no registro.",
            "Aparecer no mesmo processo é coocorrência: não prova amizade, contratação ou "
            "parcialidade.",
        ),
        "cnj": _CNJ,
        "fact_date": (
            "Data do fato que a ocorrência descreve.",
            "Informada no registro, a partir da fonte.",
            "Qualificação e impedimento são medidos nessa data, não na data de hoje.",
        ),
        "what_found": (
            "O que foi efetivamente encontrado na fonte.",
            "Texto de quem registrou, com a fonte indicada na ficha.",
            "Descreve o achado, não a conclusão: o que ele permite afirmar está na ficha.",
        ),
        "created_at": _CREATED,
        "updated_at": _UPDATED,
    },
    "engine_findings": {
        "title": (
            "Pergunta do roteiro do motor a que o achado responde.",
            "Texto do checklist do motor; a resposta fica no fundamento do achado.",
            "A pergunta sozinha não é a conclusão: o fundamento e a consequência dizem o que "
            "foi apontado.",
        ),
        "block_key": (
            "Bloco temático do motor que produziu o achado.",
            "Identificador do bloco na saída do motor.",
            "Bloco que falhou não gera achado: ausência de achado não significa ausência de vício.",
        ),
        "review_state": (
            "Estado da revisão humana do achado.",
            "Alterado apenas por revisor, com fundamento e histórico.",
            "Todo achado nasce pendente; saída de motor não é conclusão jurídica.",
        ),
        "has_evidence": (
            "Indica se o achado tem página de origem conferida.",
            "A página e o trecho citados pelo motor são conferidos contra o documento enviado.",
            "Sem evidência conferida o achado fica pendente e não pode ser validado.",
        ),
        "pendencies_count": (
            "Problemas de lastro do achado.",
            "Contagem de pendências: sem citação, página inexistente, trecho não localizado.",
            "Acima de zero, o achado não sustenta ajuste de valor nem decisão.",
        ),
        "risk_index": (
            "Índice de risco atribuído pelo motor ao achado, de 0 a 100.",
            "Calculado pelo motor, com metodologia própria e não homologada.",
            "Maior indica risco maior segundo o motor. Não é probabilidade nem estimativa de "
            "êxito.",
        ),
        "support_strength": (
            "Força do suporte do achado, segundo o motor.",
            "Classificação do motor: forte, moderado, fraco ou não avaliado.",
            "Mede o apoio que o motor viu no texto; não dispensa conferir a página.",
        ),
        "simulated_side": (
            "Lado do processo para o qual a auditoria foi feita.",
            "Confirmado por quem pediu a execução.",
            "É o lado de quem se beneficia do vício apontado; não é a posição econômica avaliada.",
        ),
        "is_mock": (
            "Indica se a execução foi real ou em modo de teste do motor.",
            "Declarado pelo próprio motor na saída.",
            "Achado de execução simulada é dado de teste: não representa análise e não pode "
            "ser validado.",
        ),
        "run_stale": (
            "Indica se a execução continua correspondendo ao dossiê atual.",
            "Marcada como desatualizada quando o dossiê recebe documento novo.",
            "Achado de execução desatualizada precisa de nova auditoria antes de ser usado.",
        ),
        "created_at": _CREATED,
    },
    "p4_items": {
        "text": (
            "Texto da prova mapeada ou do quesito gerado.",
            "Lido do relatório do P4, sem alteração.",
            "Prova é o que o P4 localizou; quesito é pergunta técnica derivada dela.",
        ),
        "kind": (
            "Etapa do P4 a que o item pertence: prova, quesito ou resposta.",
            "Definida pela aba ou categoria do relatório.",
            "Etapa sem itens indica análise incompleta do P4.",
        ),
        "index_key": (
            "Bloco de índice do P4.",
            "Identificador do bloco no relatório.",
            "Liga provas, quesitos e respostas do mesmo assunto.",
        ),
        "evidence_type": (
            "Classificação da prova pelo P4: documental, pericial, testemunhal e outras.",
            "Lida do relatório.",
            "É a classificação do motor, sujeita a revisão.",
        ),
        "page": (
            "Página do documento analisado a que o item se refere.",
            "Extraída da referência em texto livre do P4 e conferida contra o documento.",
            "Vazio indica referência sem página identificável: o item fica com pendência.",
        ),
        "reference_raw": (
            "Referência como o P4 a escreveu.",
            "Copiada do relatório: “fls. 12”, “pág. 12”.",
            "É a fonte da coluna Página; divergência entre as duas pede conferência.",
        ),
        "answer": (
            "Resposta técnica do P4 ao quesito.",
            "Lida do relatório.",
            "É saída de modelo: precisa de conferência com a prova citada.",
        ),
        "technical_status": (
            "Situação da resposta, segundo o P4.",
            "Lida do relatório.",
            "Vazio indica resposta sem status: tratar como não respondida.",
        ),
        "pendencies_count": (
            "Problemas de lastro do item.",
            "Contagem de pendências: sem página ou página inexistente no documento analisado.",
            "Acima de zero, o item não é conferível como veio.",
        ),
        "position": (
            "Ordem do item no relatório do P4.",
            "Posição da linha na planilha importada.",
            "Serve para reencontrar o item no arquivo original.",
        ),
        "run_stale": (
            "Indica se o relatório continua correspondendo ao dossiê atual.",
            "Marcado como desatualizado quando o dossiê recebe documento novo.",
            "Item de relatório desatualizado pede nova execução do P4.",
        ),
        "imported_at": (
            "Momento em que o relatório foi importado.",
            "Carimbo do servidor na importação.",
            "Não é a data em que o P4 foi executado: o relatório não a informa.",
        ),
    },
    "missing_pieces": {
        "description": (
            "Peça citada ou esperada que não está no dossiê.",
            "Registrada na importação ou por pessoa.",
            "Enquanto faltar, o que depende dela não pode ser afirmado.",
        ),
        "status": (
            "Situação da lacuna: em aberto, recebida ou dispensada.",
            "Alterada por quem trabalha o dossiê.",
            "Em aberto é ponto cego: não equivale a ausência de irregularidade.",
        ),
        "reason": (
            "Por que a peça é esperada ou por que falta.",
            "Texto da importação ou de quem registrou.",
            "Ajuda a decidir se a falta impede a análise.",
        ),
        "source": (
            "Como a lacuna foi identificada.",
            "Na importação, pela origem, ou por registro manual.",
            "A falta de autos integrais é declarada em toda importação da originação.",
        ),
        "created_at": _CREATED,
    },
    "calculation_scenarios": {
        "scenario": (
            "Cenário de desfecho avaliado no demonstrativo.",
            "Nome dado por quem informou as premissas.",
            "Cada cenário é uma hipótese; a soma só faz sentido com probabilidades aprovadas.",
        ),
        "side": (
            "Demonstrativo a que o cenário pertence.",
            "Recebimento do autor ou redução de passivo do réu, calculados em separado.",
            "Um não é derivado do outro por subtração.",
        ),
        "net_result": (
            "Resultado líquido do cenário, na moeda e data-base do demonstrativo.",
            "Autor: recebimento bruto, mais ou menos impactos de valor, menos custos. Réu: "
            "exposição de referência menos desembolso e custos ainda não incluídos.",
            "Valor negativo é preservado. Metodologia não homologada; redução de passivo é "
            "economia do cliente, não receita.",
        ),
        "present_value": (
            "Resultado líquido trazido à data-base.",
            "Cada componente descontado pela taxa aprovada, no prazo de cada um: "
            "valor / (1 + taxa) ^ "
            "anos.",
            "Vazio indica ausência de taxa de desconto aprovada; não equivale a zero.",
        ),
        "probability": (
            "Probabilidade atribuída ao cenário.",
            "Informada como premissa e aprovada por responsável; nunca derivada de score.",
            "Vazio indica cenário sem probabilidade: não se presume êxito de 100%.",
        ),
        "impacts_applied": (
            "Ajustes de achados e vínculos que entraram na conta do cenário.",
            "Contagem dos impactos aplicados: um por causa e por dimensão.",
            "Cada impacto aplicado aparece na memória de cálculo, com a fonte.",
        ),
        "impacts_not_applied": (
            "Ajustes informados que não entraram na conta.",
            "Contagem dos impactos de mesma causa de outro já aplicado, ou apenas informativos.",
            "Existem para evitar dupla contagem; o motivo de cada um está na memória.",
        ),
        "stale": (
            "Indica se o cálculo corresponde ao dossiê atual.",
            "Marcado como desatualizado quando o dossiê recebe documento novo.",
            "Desatualizado continua consultável, mas pede novo cálculo antes de memorando.",
        ),
        "formula_version": (
            "Versão da fórmula usada no cálculo.",
            "Gravada com cada execução.",
            "Execuções de versões diferentes não são diretamente comparáveis.",
        ),
        "dossier_version": _DOSSIER_VERSION,
        "created_at": (
            "Momento em que o cálculo foi executado.",
            "Carimbo do servidor na execução.",
            "Não é a data-base do demonstrativo.",
        ),
    },
}


def help_for(table_key: str, column_key: str, fallback: str = "") -> str:
    parts = COLUMN_HELP.get(table_key, {}).get(column_key)
    return build(*parts) if parts else fallback
