
# Kickoff Issues

## P0
- repo: Initialize monorepo (pnpm, turbo, lint, prettier, tsconfig, CI)
- bridge-sdk: scaffold API (broadcast, raiseIntent, joinUserChannel) + basic typings
- services/bridge: Express+WS server; routes: /healthz, /agent/info; POST /v1/context/broadcast; POST /v1/intents/raise
- services/appd: CRUD /v1/apps (in-memory), validation, OpenAPI stub
- apps/appd-admin: Next.js scaffold, CRUD forms for App entries
- apps/devtools: Next.js scaffold; tabs: Channels, Intents; simple broadcast/raise UI
- tools/conformance: CLI skeleton; load suite config; HTML/JUnit reporters
- Observability: pino logs + request ids; hooks for OpenTelemetry
- Security base: CORS config, JWT middleware placeholder, .env handling

## P1
- RBAC for AppD; token-based auth
- Import/Export JSON for AppD Admin
- Channel policies and audit hooks in Bridge
- Adapters interface and interop.io adapter stub

## P2
- Test coverage (vitest) + example tests
- Dockerfiles + docker-compose for local stack
- Metrics endpoint /metrics (Prometheus)
