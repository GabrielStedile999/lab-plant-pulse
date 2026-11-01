import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import mqtt, { type MqttClient } from 'mqtt';
import pino from 'pino';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { IngestTelemetry } from '../../application/use-cases/IngestTelemetry';
import { InMemoryTelemetryStore } from '../../infrastructure/db/memory/InMemoryTelemetryStore';
import { InMemoryReadingDedupe } from '../../infrastructure/dedupe/InMemoryReadingDedupe';
import { SystemClock } from '../../infrastructure/time/SystemClock';
import { MqttTelemetrySubscriber } from './MqttTelemetrySubscriber';

const ASSET = '0192f1a2-7c3e-7000-8000-000000000001';
const TOPIC = `plant/estamparia/${ASSET}/telemetry`;

const payload = () =>
  JSON.stringify({ readingId: crypto.randomUUID(), assetId: ASSET, ts: new Date().toISOString(), metrics: { temperature: 70 }, status: 'running' });

describe('MqttTelemetrySubscriber', () => {
  let broker: StartedTestContainer;
  let url: string;
  let publisher: MqttClient;
  let store: InMemoryTelemetryStore;
  let subscriber: MqttTelemetrySubscriber;
  const rejected = vi.fn();

  beforeAll(async () => {
    broker = await new GenericContainer('eclipse-mosquitto:2')
      .withCopyContentToContainer([{ content: 'listener 1883\nallow_anonymous true\n', target: '/mosquitto/config/mosquitto.conf' }])
      .withExposedPorts(1883)
      .withWaitStrategy(Wait.forLogMessage(/mosquitto version .* running/))
      .start();
    url = `mqtt://${broker.getHost()}:${broker.getMappedPort(1883)}`;
    publisher = await mqtt.connectAsync(url);
  });

  afterAll(async () => {
    await publisher.endAsync();
    await broker.stop();
  });

  beforeEach(async () => {
    store = new InMemoryTelemetryStore();
    const ingest = new IngestTelemetry(store, new InMemoryReadingDedupe(), new SystemClock());
    subscriber = new MqttTelemetrySubscriber(ingest, pino({ level: 'silent' }), {
      url,
      clientId: `test-${Date.now()}`,
      batchSize: 3,
      flushIntervalMs: 100,
      onRejected: rejected,
    });
    await subscriber.start();
    rejected.mockClear();
  });

  afterEach(async () => {
    await subscriber.stop();
  });

  it('flushes as soon as the batch size is reached', async () => {
    await Promise.all([1, 2, 3].map(() => publisher.publishAsync(TOPIC, payload(), { qos: 1 })));

    await vi.waitFor(() => expect(store.readings).toHaveLength(3), { timeout: 2_000 });
  });

  it('flushes a partial batch after the interval', async () => {
    await publisher.publishAsync(TOPIC, payload(), { qos: 1 });

    await vi.waitFor(() => expect(store.readings).toHaveLength(1), { timeout: 2_000 });
  });

  it('drops malformed messages without stopping the consumer', async () => {
    await publisher.publishAsync(TOPIC, 'not json', { qos: 1 });
    await publisher.publishAsync(TOPIC, JSON.stringify({ readingId: 'nope' }), { qos: 1 });
    await publisher.publishAsync(TOPIC, payload(), { qos: 1 });

    await vi.waitFor(() => expect(store.readings).toHaveLength(1), { timeout: 2_000 });
    expect(rejected).toHaveBeenCalledTimes(2);
  });

  it('flushes what is buffered on stop', async () => {
    await publisher.publishAsync(TOPIC, payload(), { qos: 1 });
    await vi.waitFor(() => expect(subscriber.buffered).toBe(1), { timeout: 2_000 });

    await subscriber.stop();

    expect(store.readings).toHaveLength(1);
  });
});