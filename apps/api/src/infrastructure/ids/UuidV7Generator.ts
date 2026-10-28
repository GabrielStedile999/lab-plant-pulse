import { v7 as uuidv7 } from 'uuid';
import type { IdGenerator } from '../../application/ports/IdGenerator';

/** UUID v7: os primeiros 48 bits são timestamp, então ids ordenam por criação e indexam bem no Postgres. */
export class UuidV7Generator implements IdGenerator {
  next(): string {
    return uuidv7();
  }
}