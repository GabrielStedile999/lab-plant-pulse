ADR-004: Telemetria em time-series collection do MongoDB com retenção de 7 dias
Status: aceito · Data: 2026-10-31

Contexto
Telemetria é append-only, de alto volume, consultada por (assetId, janela de tempo) e perde valor em
dias. O ADR-002 escolheu o MongoDB para esse dado; falta decidir a forma.

Decisão
Coleção telemetry criada como time series: timeField: ts, metaField: assetId,
granularity: seconds, expireAfterSeconds: 604800 (7 dias). Criação idempotente na subida da API
(ensureTelemetrySchema), que é a "migração" do Mongo.

Índice secundário { assetId: 1, ts: 1 }, o padrão de toda consulta.
Documento: { _id: readingId, assetId, ts, metrics: { temperature?, vibration?, rpm? }, status } —
só as métricas presentes; _id por rastreabilidade (não é indexado em time series).

Agregação por janela feita no servidor ($dateTrunc + $avg), com teto de 5 000 pontos por resposta.
Alternativas consideradas
Coleção comum com índice único em readingId: perderia compressão por bucket e TTL nativo; a
deduplicação foi resolvida no use case (ADR-003).

TimescaleDB: é Postgres; a vaga pede experiência com NoSQL e o Mongo cobre este perfil de dado bem.
Consequências
timeField/metaField são imutáveis após a criação: mudar exige nova coleção e migração de dados.
Janela máxima de consulta = retenção (7 dias); pedir mais é erro de validação, não resultado vazio.
Sem transação entre Postgres e Mongo; o desenho não precisa de uma.