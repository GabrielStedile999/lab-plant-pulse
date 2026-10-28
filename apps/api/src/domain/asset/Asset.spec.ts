import { describe, expect, it } from 'vitest';
import { Asset, type AssetProps } from './Asset';

const valid: AssetProps = {
  id: '0192f1a2-7c3e-7000-8000-000000000001',
  name: 'Prensa 01',
  sector: 'Estamparia',
  sensors: ['temperature', 'vibration'],
  createdAt: new Date('2026-10-26T12:00:00Z'),
};

describe('Asset.create', () => {
  it('creates an asset when every invariant holds', () => {
    const result = Asset.create(valid);

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrowing para o TS; o expect acima já garante
    expect(result.value.id).toBe(valid.id);
    expect(result.value.name).toBe('Prensa 01');
    expect(result.value.sensors).toEqual(['temperature', 'vibration']);
  });

  it('trims name and sector', () => {
    const result = Asset.create({ ...valid, name: '  Prensa 01  ', sector: ' Estamparia ' });

    expect(result.ok && result.value.name).toBe('Prensa 01');
    expect(result.ok && result.value.sector).toBe('Estamparia');
  });

  it.each([
    ['', 'ASSET_NAME_EMPTY'],
    ['   ', 'ASSET_NAME_EMPTY'],
    ['x'.repeat(81), 'ASSET_NAME_TOO_LONG'],
  ])('rejects name %j with %s', (name, code) => {
    const result = Asset.create({ ...valid, name });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe(code);
  });

  it('rejects an empty sector', () => {
    const result = Asset.create({ ...valid, sector: '' });

    expect(!result.ok && result.error.code).toBe('ASSET_SECTOR_EMPTY');
  });

  it('rejects an asset without sensors', () => {
    const result = Asset.create({ ...valid, sensors: [] });

    expect(!result.ok && result.error.code).toBe('ASSET_SENSORS_EMPTY');
  });

  it('deduplicates sensors, preserving order', () => {
    const result = Asset.create({ ...valid, sensors: ['rpm', 'temperature', 'rpm'] });

    expect(result.ok && result.value.sensors).toEqual(['rpm', 'temperature']);
  });

  it('does not expose its internal sensors array for mutation', () => {
    const result = Asset.create(valid);
    if (!result.ok) throw new Error('expected ok');

    const snapshot = result.value.toJSON();
    snapshot.sensors.push('rpm');

    expect(result.value.sensors).toEqual(['temperature', 'vibration']);
  });
});

describe('Asset.restore', () => {
  it('rehydrates without validating (data already persisted is trusted)', () => {
    const asset = Asset.restore(valid);

    expect(asset.name).toBe('Prensa 01');
    expect(asset.createdAt).toEqual(valid.createdAt);
  });
});