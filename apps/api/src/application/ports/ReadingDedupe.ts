export interface ReadingDedupe {
  filterNew(ids: string[]): Promise<string[]>;
}