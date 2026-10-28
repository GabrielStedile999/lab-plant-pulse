import { SENSOR_TYPES as CONTRACT_SENSOR_TYPES } from '@lab-plant-pulse/contracts';
import { describe, expect, it } from 'vitest';
import { SENSOR_TYPES as DOMAIN_SENSOR_TYPES } from '../../domain/asset/Asset';

describe('contracts ↔ domain parity', () => {
  it('keeps the sensor type lists identical', () => {
    expect([...DOMAIN_SENSOR_TYPES]).toEqual([...CONTRACT_SENSOR_TYPES]);
  });
});