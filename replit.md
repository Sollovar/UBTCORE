# DEX Trade

A decentralized exchange (DEX) frontend supporting Ethereum and Solana wallet connections, token swapping, portfolio tracking, and real-time chain statistics.

## Run & Operate

- `pnpm --filter @workspace/dex run dev` — run the DEX frontend (port 23444, set via PORT env var)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (for API server / DB layer)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4, TanStack Query, Wouter, Radix UI / Shadcn
- Auth/Wallets: Dynamic.xyz (`@dynamic-labs/sdk-react-core`) — Web3 wallet connectors for Ethereum + Solana
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle for server), Vite (frontend)

## Where things live

- `artifacts/dex/` — main React frontend (desktop + mobile views)
- `artifacts/api-server/` — Express backend
- `artifacts/mockup-sandbox/` — UI component prototyping environment
- `lib/db/` — Drizzle ORM schema + PostgreSQL client
- `lib/api-spec/` — OpenAPI spec (`openapi.yaml`) + codegen config
- `lib/api-client-react/` — generated TanStack Query hooks
- `lib/api-zod/` — generated Zod schemas
- `artifacts/dex/src/contexts/WalletProvider.tsx` — Dynamic.xyz wallet auth setup

## Architecture decisions

- Monorepo with pnpm workspaces; shared packages in `lib/`, apps in `artifacts/`
- Web3 wallet auth via Dynamic.xyz — environment ID is a public client-side config, not a secret
- Public blockchain RPCs (BSC, Base, Solana mainnet) used directly from the frontend — no API keys required
- CoinGecko public API used for pricing data — no key required for basic usage
- API server and frontend run as separate processes; frontend proxies API calls during dev

## Product

A DEX trading interface letting users connect Ethereum and Solana wallets, view portfolio balances, monitor chain stats, and perform token swaps across BSC, Base, and Solana networks.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `PORT` and `BASE_PATH` env vars are required for the DEX frontend (`vite.config.ts` will throw without them)
- The workflow runs with `PORT=23444 BASE_PATH=/`
- `pnpm install` must be run before any workflow starts; the lockfile is committed

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
