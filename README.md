
# FinServ Interop Toolkit (FDC3)

Monorepo scaffold for the FinServ Interop Toolkit. This repository contains:
- `packages/bridge-sdk`: a TypeScript SDK for FDC3-like APIs (broadcast, raiseIntent, channels).
- `services/bridge`: a Bridge Service (Node.js + Express + WS) providing context/intent routing.
- `services/appd`: an App Directory API (Node.js + Express) with placeholder storage.
- `apps/appd-admin`: Admin UI (Next.js) to manage App Directory entries.
- `apps/devtools`: Web DevTools (Next.js) for channels/intents inspection and manual actions.
- `tools/conformance`: CLI runner scaffold to execute conformance suites and output reports.
- `adapters/*`: container adapters (interop.io, Finsemble, OpenFin) – placeholder interfaces.

## Quick start

```bash
# install workspace deps
pnpm install

# build all packages
pnpm build

# start services (in separate terminals)
pnpm --filter @finserv/bridge dev
pnpm --filter @finserv/appd dev

# start UIs
pnpm --filter @finserv/appd-admin dev
pnpm --filter @finserv/devtools dev
```
