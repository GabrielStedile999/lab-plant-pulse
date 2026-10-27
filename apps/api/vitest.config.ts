import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    testTimeout: 30_000,   // testes de integração sobem container
    hookTimeout: 120_000,  // o primeiro pull da imagem do Postgres demora
  },
});