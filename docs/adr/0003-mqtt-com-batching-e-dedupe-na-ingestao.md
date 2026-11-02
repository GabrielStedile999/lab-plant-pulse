ADR-003: Ingestão por MQTT com batching e janela de deduplicação
Status: aceito · Data: 2026-10-31

Contexto
Máquinas publicam uma leitura por segundo cada. O volume cresce linearmente com o número de máquinas
(5 hoje; centenas em uma planta real) e a API precisa absorver picos sem perder leituras nem derrubar o
banco com uma escrita por mensagem. O transporte precisa tolerar reinícios da API sem que o produtor saiba.

Decisão
MQTT (Mosquitto) como transporte, tópico plant/{sector}/{assetId}/telemetry, QoS 1, sessão persistente
(clean: false, clientId fixo): o broker retém o que chegar enquanto a API estiver fora.

O subscriber (interfaces/mqtt) valida cada mensagem pelo contrato Zod, descarta e conta as inválidas,
e acumula as válidas em lotes de até 100 leituras ou 500 ms — o que vier primeiro. Lotes são processados
em série (nunca dois insertMany concorrentes).

Idempotência por janela de deduplicação (ReadingDedupe: últimos 50 mil readingIds em memória),
porque QoS 1 reentrega apenas em reconexão, em segundos. Time-series collections do MongoDB não
suportam índice único, então a garantia forte não está disponível e não é necessária.

O mesmo use case IngestTelemetry serve o MQTT e o POST /telemetry/batch (backfill/integrações).
Consequências
Latência de ingestão ≤ 500 ms em tráfego baixo; throughput limitado pelo Mongo, não pelo Node.
Um lote em memória pode se perder em queda abrupta do processo (≤ 500 ms de leituras). Aceito para
telemetria; o shutdown ordenado descarrega o buffer em SIGTERM.

Sem limite no buffer: se o Mongo parar, a memória cresce. Backpressure (pausar a assinatura acima de
N leituras) fica para o ADR do dia 7.

Dedupe em memória não é compartilhado entre réplicas; com múltiplas instâncias, Redis (dia 7).