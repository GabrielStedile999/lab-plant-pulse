# Lab Plant Pulse

Monitoramento de chão de fábrica: máquinas publicam telemetria por MQTT, a API avalia regras de alerta e um
dashboard Angular mostra tudo em tempo real. Projeto de estudo de uma semana cobrindo Node/TypeScript com clean
architecture, Angular 22, Postgres + MongoDB, TDD, Docker, CI e observabilidade com OpenTelemetry.

## Rodar

```bash
corepack enable && pnpm install
cp .env.example .env
pnpm infra:up          # postgres, mongo, mosquitto, grafana (localhost:3001)
pnpm dev               # api em localhost:3000 (migrações rodam na subida)
```

## Testar

```bash
pnpm test              # unidade + integração (Testcontainers precisa do Docker ativo)
pnpm lint && pnpm typecheck && pnpm arch:check
```

## Arquitetura

Quatro camadas na API (`domain → application → infrastructure → interfaces`), regra de dependência verificada
na CI. Decisões em [docs/adr](docs/adr).
