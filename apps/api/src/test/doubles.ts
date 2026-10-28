import type { Clock } from '../application/ports/Clock';
import type { IdGenerator } from '../application/ports/IdGenerator';

export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  constructor(private readonly prefix = 'id') {}
  next(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}

/** UUIDs válidos e previsíveis: ...-000000000001, ...-000000000002 (versão 7, variante 8). */
export class SequentialUuidGenerator implements IdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `0192f1a2-7c3e-7000-8000-${String(this.counter).padStart(12, '0')}`;
  }
}