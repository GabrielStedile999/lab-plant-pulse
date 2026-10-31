ADR-001: Clean architecture em quatro camadas na API
Status: aceito · Data: 2026-10-26

Contexto
A API vai crescer de um CRUD de ativos para ingestão de telemetria por MQTT, avaliação de regras de alerta,
stream SSE e um MCP server — quatro formas diferentes de entrar e sair do mesmo domínio. Sem uma separação
explícita, a regra de negócio acaba espalhada em handlers HTTP e callbacks de MQTT, e cada novo canal
duplica lógica.

Decisão
Quatro camadas com dependência apontando sempre para dentro:

domain: entidades, value objects e erros de negócio. TypeScript puro, sem imports de pacote.
application: use cases (orquestração) e ports (interfaces do que o domínio precisa de fora:
repositórios, relógio, gerador de id, event bus).

infrastructure: adapters que implementam os ports (Drizzle/Postgres, MongoDB, MQTT, relógio real).
interfaces: entradas — rotas Fastify, subscriber MQTT, SSE, tools MCP. Só traduzem; não decidem.
O main.ts é o único composition root. A regra é verificada por dependency-cruiser na CI (pnpm arch:check).

Erros de negócio são retornados como Result<T, E>; exceções ficam reservadas a falhas de infraestrutura.

Consequências
Use cases testados sem I/O, em milissegundos; adapters testados contra serviços reais via Testcontainers.
Mais arquivos e mais mapeamento (DTO ↔ entidade ↔ linha) do que um CRUD direto. Aceito: o custo é pago
uma vez; o ganho aparece a cada canal novo.

A lista de tipos de sensor existe no domínio e no pacote contracts; um teste de paridade impede divergência.