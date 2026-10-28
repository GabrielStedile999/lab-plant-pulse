import { beforeEach, describe, expect, it } from 'vitest';
import { ListAssets } from '../../../application/use-cases/ListAssets';
import { RegisterAsset } from '../../../application/use-cases/RegisterAsset';
import { InMemoryAssetRepository } from '../../../infrastructure/db/memory/InMemoryAssetRepository';
import { FixedClock, SequentialUuidGenerator } from '../../../test/doubles';
import { buildServer, type App } from '../server';

const body = { name: 'Prensa 01', sector: 'Estamparia', sensors: ['temperature'] };

describe('assets routes', () => {
  let app: App;

  beforeEach(async () => {
    const repository = new InMemoryAssetRepository();
    app = buildServer({
      registerAsset: new RegisterAsset(
        repository,
        new FixedClock(new Date('2026-10-26T12:00:00Z')),
        new SequentialUuidGenerator(), // o schema de resposta exige uuid válido
      ),
      listAssets: new ListAssets(repository),
      checkPostgres: async () => true,
    });
    await app.ready();
  });

  it('POST /assets registers and returns 201 with the asset dto', async () => {
    const response = await app.inject({ method: 'POST', url: '/assets', payload: body });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: '0192f1a2-7c3e-7000-8000-000000000001',
      name: 'Prensa 01',
      sector: 'Estamparia',
      sensors: ['temperature'],
      createdAt: '2026-10-26T12:00:00.000Z',
    });
  });

  it('POST /assets returns 409 when the name is taken', async () => {
    await app.inject({ method: 'POST', url: '/assets', payload: body });

    const response = await app.inject({ method: 'POST', url: '/assets', payload: body });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'ASSET_NAME_TAKEN' });
  });

  it('POST /assets returns 400 when the body fails the contract schema', async () => {
    const response = await app.inject({ method: 'POST', url: '/assets', payload: { ...body, sensors: [] } });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST /assets returns 422 when the body passes the schema but breaks a domain rule', async () => {
    const response = await app.inject({ method: 'POST', url: '/assets', payload: { ...body, name: '   ' } });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'ASSET_NAME_EMPTY' });
  });

  it('GET /assets lists registered assets', async () => {
    await app.inject({ method: 'POST', url: '/assets', payload: body });

    const response = await app.inject({ method: 'GET', url: '/assets' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
  });

  it('GET /health reports postgres status', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checks: { postgres: 'up' } });
  });
});