# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

Crypto Research Terminal is an npm-workspaces monorepo built with TypeScript and Node.js 22 or newer. It has three workspaces:

- `apps/web`: Next.js 16 App Router UI using React 19, TanStack Query, TanStack Table, and Lightweight Charts.
- `apps/api`: Express 5 API using Better Auth, Prisma, PostgreSQL, Redis, and CoinGecko.
- `packages/contracts`: shared Zod schemas and inferred TypeScript types used at both application boundaries.

The browser must call the Express API rather than CoinGecko directly. All research features are available to guests. Guest workspaces persist in the current browser; account workspaces sync through authenticated API routes.

## Repository map

- `apps/web/app`: routes, layouts, route-level loading, and global styles.
- `apps/web/components`: interactive client components and feature UI.
- `apps/web/lib/api.ts`: typed HTTP client and workspace API operations.
- `apps/web/lib/auth-client.ts`: centralized Better Auth browser client.
- `apps/web/lib/theme.ts`: theme preferences and legacy storage cleanup.
- `apps/web/lib/guest-workspace.ts`: versioned browser-local guest workspace storage.
- `apps/web/e2e`: Playwright desktop, mobile, and accessibility journeys.
- `apps/api/src/app.ts`: Express application composition and public capability endpoints.
- `apps/api/src/market-routes.ts`: public market and research endpoints.
- `apps/api/src/workspace-routes.ts`: authenticated, user-owned persistence endpoints.
- `apps/api/src/auth.ts`: Better Auth configuration.
- `apps/api/src/coingecko.ts`: upstream CoinGecko client.
- `apps/api/src/cache.ts`: Redis cache with an in-memory fallback.
- `apps/api/prisma/schema.prisma`: authentication and workspace data model.
- `packages/contracts/src/index.ts`: shared public API contracts.

## Required workflow

1. Read the nearest `AGENTS.md` before editing. `apps/web/AGENTS.md` contains generated Next.js-version guidance that also applies inside the web workspace.
2. Inspect the relevant implementation and tests before changing behavior.
3. Preserve unrelated working-tree changes; do not reset or rewrite user work.
4. Update shared Zod contracts before or alongside API response changes, then update both consumers and tests.
5. Run the narrowest relevant checks while iterating and the full appropriate checks before handoff.
6. After any large or cross-cutting code change, always run `npm run lint` and `npm run build` from the repository root and resolve any failures before handoff.

## Commands

Run commands from the repository root unless a command explicitly targets a workspace.

```bash
npm install                    # install all workspace dependencies
npm run dev                    # run API on :4000 and web on :3000
npm run typecheck              # type-check contracts, API, and web
npm run lint                   # lint API and web
npm test                       # run API and web Vitest suites
npm run build                  # production build for all workspaces
npm run format:check           # check formatting
npm run db:generate            # regenerate the Prisma client
npm run db:migrate             # create/apply a local Prisma migration
npm run test:e2e -w @crypto-terminal/web
```

For focused checks, use npm's workspace flag, for example:

```bash
npm run test -w @crypto-terminal/api
npm run typecheck -w @crypto-terminal/web
```

The contracts workspace must be built before downstream workspaces consume newly changed contracts. The root scripts already enforce that ordering where needed.

## Environment and generated files

- Copy `.env.example` to the repository-root `.env` for local development.
- Both applications deliberately load the root `.env`; do not create competing workspace environment files.
- Never commit `.env`, credentials, session data, or provider secrets.
- Authentication capabilities are conditional:
  - Google requires `DATABASE_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
  - Email/password requires `DATABASE_URL`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`.
  - Production authentication also requires an explicit `BETTER_AUTH_SECRET`.
- PostgreSQL is the source of truth for account workspace data. Guest workspace data stays in browser storage. Redis is only a cache.
- Do not commit `.next`, `dist`, coverage, Playwright reports, logs, or generated Prisma client output.
- When the Prisma schema changes, add a migration and run `npm run db:generate`.

## Architecture invariants

### API and contracts

- Validate external input and public responses with Zod; shared request/response shapes belong in `packages/contracts`.
- Keep upstream CoinGecko details behind `apps/api`; normalize provider errors instead of leaking raw responses.
- Preserve request timeouts, rate limiting, cache behavior, request IDs, and structured error handling when extending routes.
- Use `ApiException` for intentional HTTP errors.
- Every workspace route must authenticate the session and scope all reads and mutations to the current user. UI locks are not authorization.
- Primary-watchlist operations must remain race-safe and must not require the client to know a generated watchlist ID.

### Authentication and persistence

- Better Auth is mounted on the Express API and uses secure HTTP-only cookies; never store tokens or sessions in browser storage.
- Preserve validated relative `returnTo` redirects. Never allow an external URL as an authentication callback.
- Email/password accounts require email verification. Keep password reset and verification responses privacy-preserving.
- Google is the only social provider unless the product requirements explicitly change.
- Guests may use watchlists, saved screens, and research notes through the browser-local workspace adapter.
- Keep guest data separate from account data. Do not automatically merge workspaces or store sessions/tokens in browser storage.
- Intentional localStorage keys are `cryptoTerminal.theme` and `cryptoTerminal.guestWorkspace.v1`; preserve the pre-hydration theme script.

### Web application

- Use Server Components by default and add `"use client"` only where browser state, effects, or event handlers require it.
- Use the centralized auth provider/client and `apps/web/lib/api.ts`; do not create feature-local session clients or ad hoc fetch layers.
- Use TanStack Query for authenticated server state, with optimistic updates only when rollback is safe and explicit.
- Resolve account state before choosing the account API or guest adapter. Scope query caches by owner and switch to the guest workspace on sign-out.
- Keep workspace controls usable without an account; explain browser-only guest persistence.
- Maintain keyboard navigation, focus restoration, reduced-motion behavior, semantic tables/forms, and accessible chart data summaries.

## Testing expectations

- Add or update tests whenever behavior, contracts, authorization, redirect validation, persistence, or formatting logic changes.
- API tests use Vitest and Supertest and live next to source files as `*.test.ts`.
- Web unit tests use Vitest and Testing Library; end-to-end and accessibility coverage uses Playwright.
- After browser-visible changes, use the `computer-use` skill with the Codex in-app browser for a live smoke test of the changed journey at the relevant desktop and mobile breakpoints.
- During the live browser pass, verify interaction results and applicable loading, error, keyboard-focus, and accessibility states using fresh visual and accessibility output.
- Keep `npm run test:e2e -w @crypto-terminal/web` as the deterministic automated browser suite; it complements rather than replaces the live in-app-browser pass. If the in-app browser remains unavailable after documented recovery, run Playwright and disclose the limitation at handoff.
- Authentication or workspace changes must cover guest `401` responses and cross-user ownership boundaries.
- Workspace access changes must cover guests, authenticated users, sign-out transitions, keyboard behavior, and persistence.
- Before handing off a broad change, run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Run Playwright when a browser-visible journey changed.

## Git commits

- Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) using `<type>[optional scope]: <description>`.
- Keep commits focused; use types such as `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `ci`, and `chore` according to intent.
- Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
- Do not add AI tools or assistants as authors, co-authors, sign-offs, or commit-message attribution unless the user explicitly requests it.
