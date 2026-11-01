import { TelemetryReadingSchema, type TelemetryReadingDto } from '@lab-plant-pulse/contracts';
import mqtt, { type MqttClient } from 'mqtt';
import type { Logger } from 'pino';
import type { IngestTelemetry, TelemetryReadingInput } from '../../application/use-cases/IngestTelemetry';

export interface MqttSubscriberOptions {
  url: string;
  clientId: string;
  topic?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  /** Gancho para métrica/log de mensagens inválidas; o dia 6 liga aqui um contador OTel. */
  onRejected?: (reason: string, topic: string) => void;
}

const toInput = (dto: TelemetryReadingDto): TelemetryReadingInput => ({ ...dto, ts: new Date(dto.ts) });

export class MqttTelemetrySubscriber {
  private client?: MqttClient;
  private buffer: TelemetryReadingInput[] = [];
  private timer?: NodeJS.Timeout;
  private inFlight: Promise<void> = Promise.resolve();
  private readonly topic: string;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;

  constructor(
    private readonly ingest: IngestTelemetry,
    private readonly log: Logger,
    private readonly options: MqttSubscriberOptions,
  ) {
    this.topic = options.topic ?? 'plant/+/+/telemetry';
    this.batchSize = options.batchSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 500;
  }

  /** Leituras aguardando flush (exposto para teste e, no dia 6, para a métrica de backpressure). */
  get buffered(): number {
    return this.buffer.length;
  }

  async start(): Promise<void> {
    this.client = await mqtt.connectAsync(this.options.url, {
      clientId: this.options.clientId,
      clean: false, // sessão persistente: o broker guarda QoS 1 enquanto a API estiver fora
      reconnectPeriod: 1_000,
    });
    this.client.on('message', (topic, payload) => this.onMessage(topic, payload));
    this.client.on('reconnect', () => this.log.warn('mqtt reconnecting'));
    this.client.on('error', (error) => this.log.error({ err: error }, 'mqtt client error'));
    await this.client.subscribeAsync(this.topic, { qos: 1 });
    this.log.info({ topic: this.topic, url: this.options.url }, 'mqtt subscriber started');
  }

  async stop(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    await this.flush();
    await this.client?.endAsync();
    this.client = undefined;
  }

  private onMessage(topic: string, payload: Buffer): void {
    let json: unknown;
    try {
      json = JSON.parse(payload.toString('utf8'));
    } catch {
      this.reject('invalid json', topic);
      return;
    }

    const parsed = TelemetryReadingSchema.safeParse(json);
    if (!parsed.success) {
      this.reject(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), topic);
      return;
    }

    this.buffer.push(toInput(parsed.data));
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    } else {
      this.timer ??= setTimeout(() => void this.flush(), this.flushIntervalMs);
    }
  }

  private flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    const batch = this.buffer.splice(0); // esvazia ANTES do await: mensagens que chegarem agora vão para o próximo lote
    if (batch.length === 0) return this.inFlight;

    // Encadeia no lote anterior: nunca há dois insertMany em paralelo, e a ordem de chegada é preservada.
    this.inFlight = this.inFlight
      .then(() => this.ingest.execute({ readings: batch }))
      .then((report) => {
        if (report.rejected.length > 0 || report.duplicates > 0) this.log.warn({ ...report, rejected: report.rejected.length }, 'telemetry batch partially ingested');
        else this.log.debug({ accepted: report.accepted }, 'telemetry batch ingested');
      })
      .catch((error: unknown) => this.log.error({ err: error, size: batch.length }, 'telemetry batch failed'));
    return this.inFlight;
  }

  private reject(reason: string, topic: string): void {
    this.log.warn({ topic, reason }, 'telemetry message rejected');
    this.options.onRejected?.(reason, topic);
  }
}
