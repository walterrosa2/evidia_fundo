# BLOCKED_SCHEMA_GAPS

## Resultado

A geração de dados persistíveis foi interrompida de forma intencional. Este repositório é uma aplicação frontend em TypeScript e não contém os modelos de banco nem os schemas de validação exigidos pelo prompt.

Por isso, **`seed_payload.json` não foi criado**. Criar esse arquivo sem o backend real exigiria inventar campos, enums, chaves estrangeiras e estratégia de IDs, contrariando as regras de integridade e segurança da tarefa.

## Elementos ausentes

- Modelos SQLAlchemy reais de `Case`, `Analysis`, `Finding`, `EvidenceMap` e `EvidenceItem`.
- Schemas Pydantic reais e suas regras de serialização.
- Enums, defaults, constraints, chaves estrangeiras e campos obrigatórios do backend.
- Função oficial de score global e classificação jurídica do backend.
- Formato efetivo de seed, fixture ou dry-run usado pelo serviço persistente.
- Estratégia real de criação de IDs para evidências e findings.

## O que pôde ser entregue com segurança

- Projeção de interface separada, sem pretensão de persistência.
- Ranking demonstrativo dos três casos com risco e atratividade explicitamente separados.
- Preservação dos scores revisados nos relatórios de origem.
- Cenários financeiros marcados como simulação.
- Auditoria de fontes, conflitos, dados faltantes e limitações.
- Relatório de validação com os testes executáveis neste frontend.

## Como desbloquear

Fornecer o repositório ou módulo do backend que contenha os modelos, schemas, enums, função de score e mecanismo de seed. Com isso será possível gerar um payload compatível, validar os findings no Pydantic real e executar um dry-run sem alterar produção.
