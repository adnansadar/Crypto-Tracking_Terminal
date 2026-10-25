# Crypto Research Terminal

A production-style cryptocurrency research workspace for screening the top 250 assets, studying historical performance, comparing risk, and keeping a private research log.

The project is intentionally an informational research product. It does not execute trades or provide personalized financial advice.

## What it demonstrates

- A responsive, accessible Next.js 16 interface using Server and Client Components deliberately
- A versioned Express 5 API that isolates CoinGecko, validates input, rate-limits clients, and normalizes errors
- Shared runtime and compile-time contracts with TypeScript and Zod
- Server-side market filtering, sorting, category selection, and pagination
- Line and OHLC charts with accessible tabular summaries
- Normalized return, annualized volatility, maximum drawdown, and correlation analysis
- Account-only watchlists, named lists, saved screens, and notes in PostgreSQL
- Google OAuth and verified email/password authentication through Better Auth
- Redis-compatible provider caching with a bounded in-memory fallback
- Unit, integration, accessibility, and end-to-end test foundations

## Architecture

```text
Browser
  │
  ▼
Next.js web app (apps/web)
  │  shared Zod contracts
  ▼
Express API (apps/api) ─────► PostgreSQL (accounts + research)
  │               │
  │               └────────► Redis (distributed cache)
  ▼
CoinGecko API
```

The browser never calls CoinGecko directly. Express provides a stable application contract, protects the upstream provider, and preserves a clean seam for future data sources.

## Product areas

### Market screener

- Top-250 snapshot with market breadth and BTC dominance
- Search, category, currency, valuation, liquidity, momentum, and ATH-distance filters
- Sortable and user-configurable columns
- Shareable URL state, saved screens, watchlist filtering, and pagination

### Asset research

- Dedicated asset routes with market, supply, ATH/ATL, and project metadata
- Price and candlestick modes across 7D, 30D, 90D, and 1Y ranges
- Research notes, watchlists, and saved screens available to guests and accounts

### Comparison lab

- Two to four assets per comparison
- Rebased percentage-performance chart
- Total return, annualized volatility, maximum drawdown, average volume, and correlation

The calculations describe historical observations, not forecasts. Formulas live in `apps/api/src/analytics.ts` and are covered by unit tests.

## Local development

Node 22 is required.

```bash
npm install
npm run db:generate
npm run dev
```

Open `http://localhost:3000`. The API runs on `http://localhost:4000`.

Public research and guest workspaces work without a database or authentication credentials. Guest work is saved in the current browser; signed-in work syncs through PostgreSQL. Copy `.env.example` to `.env` when enabling optional services.

## Workspace persistence and authentication

Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
npm run db:migrate
```

Create a Google OAuth web application and provide `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. For email/password accounts, also configure `RESEND_API_KEY` and a verified `AUTH_EMAIL_FROM` sender. The web app discovers available authentication methods from the API.

For local Google OAuth, use this authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Authentication and browser API requests use the web application's same-origin
proxy. In production, set `BETTER_AUTH_URL` to the public web URL and register
`<web-url>/api/auth/callback/google` as the Google authorized redirect URI.

Guests can browse markets, compare assets, save watchlists and screens, and write notes. Guest work is stored under `cryptoTerminal.guestWorkspace.v1` in localStorage and remains separate from account data. Clearing browser data removes guest work. Sign-in and sign-out switch workspaces without merging them. Account data stays private and synced through authenticated API routes.

## Commands

| Command                                    | Purpose                                |
| ------------------------------------------ | -------------------------------------- |
| `npm run dev`                              | Run the API and web app together       |
| `npm run build`                            | Build contracts, API, and web app      |
| `npm run typecheck`                        | Check all TypeScript workspaces        |
| `npm test`                                 | Run API and web unit/integration tests |
| `npm run db:generate`                      | Generate the Prisma client             |
| `npm run db:migrate`                       | Apply local PostgreSQL migrations      |
| `npm run test:e2e -w @crypto-terminal/web` | Run Playwright desktop/mobile journeys |

## Reliability and accessibility

- Provider requests have timeouts, short-lived cache keys, normalized failure responses, and request IDs.
- Market rows remain visible during background refreshes through TanStack Query placeholder data.
- Keyboard focus, reduced motion, explicit positive/negative signs, responsive cards, semantic tables, and chart data summaries are included.
- Structured API logs, `/health`, response cache state, and upstream error codes provide operational visibility.

## API surface

```text
GET /health
GET /openapi.json
GET /v1/markets
GET /v1/categories
GET /v1/coins/:coinId
GET /v1/coins/:coinId/history
GET /v1/coins/:coinId/ohlc
GET /v1/compare
CRUD /v1/watchlists
GET/PUT/DELETE /v1/watchlist
CRUD /v1/saved-screens
CRUD /v1/notes
```

Authenticated workspace routes use Better Auth session cookies and enforce resource ownership in every database query.

## Deliberate tradeoffs

- Polling is used instead of paid WebSocket access so the public demo can remain on free tiers.
- The market overview represents the fetched top-250 universe rather than claiming to be a complete global index.
- All research features are available without an account; account workspaces additionally support cross-device sync.
- The project stays a modular monolith with one explicit API boundary instead of introducing unnecessary microservices.

Market data is provided by CoinGecko. Financial charts use Lightweight Charts and retain TradingView attribution.
