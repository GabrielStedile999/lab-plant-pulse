ADR-002: PostgreSQL para cadastro e regras, MongoDB time-series para telemetria
Status: aceito · Data: 2026-10-26

Contexto
O sistema tem dois tipos de dado com perfis opostos. Ativos, regras de alerta, alertas e usuários são poucos,
relacionais (uma regra pertence a um ativo), mudam raramente e precisam de integridade (nome único,
chave estrangeira). Telemetria é alto volume (1 leitura/s por máquina, dezenas de máquinas), append-only,
consultada por janela de tempo e descartável depois de alguns dias.

Decisão
PostgreSQL 17 via Drizzle ORM para ativos, regras, alertas e usuários. Migrações versionadas em apps/api/drizzle.
MongoDB 8 com uma time-series collection (timeField: ts, metaField: assetId, granularity: seconds)
para telemetria, com expireAfterSeconds de 7 dias e índice único em readingId para idempotência.

Cada repositório implementa um port da camada application; o domínio não sabe qual banco o persiste.
Alternativas consideradas
Só Postgres com TimescaleDB: cobriria tudo, mas será implementado uma estratégia mista com SQL e NoSQL, e time-series collections do
Mongo têm compressão e TTL nativos para este perfil.

Só MongoDB: perde constraints relacionais no cadastro (nome único, FK regra → ativo) que o Postgres dá de graça.
Redis para telemetria: não persiste histórico com o custo-benefício certo para consultas por janela.
Consequências
Dois drivers, dois containers, dois conjuntos de testes de integração.
Não há transação atravessando os dois bancos; o desenho evita precisar de uma (telemetria referencia
ativo por id, nunca o contrário).