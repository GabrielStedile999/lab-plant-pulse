import type { ReadingDedupe } from '../../application/ports/ReadingDedupe';

/**
 * LRU de ids: um Map preserva ordem de inserção, então o primeiro `keys()` é o mais antigo.
 * Com 50 mil entradas e 5 máquinas a 1 Hz, cobre ~2h45 de leituras; redelivery do MQTT acontece em segundos.
 */
export class InMemoryReadingDedupe implements ReadingDedupe {
  private readonly seen = new Map<string, true>();

  constructor(private readonly maxEntries = 50_000) {}

  async filterNew(ids: string[]): Promise<string[]> {
    const fresh: string[] = [];
    for (const id of ids) {
      if (this.seen.has(id)) continue;
      this.seen.set(id, true);
      fresh.push(id);
      if (this.seen.size > this.maxEntries) {
        const oldest = this.seen.keys().next().value;
        if (oldest !== undefined) this.seen.delete(oldest);
      }
    }
    return fresh;
  }

  get size(): number {
    return this.seen.size;
  }
}
