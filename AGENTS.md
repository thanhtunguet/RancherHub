# RancherHub — Project Overview

RancherHub is a Service Sync Manager for managing and synchronizing services across different environments in Rancher Kubernetes clusters. It provides a unified dashboard for DevOps teams to connect multiple Rancher instances, organize applications by environment (Dev, Staging, Production), and perform service synchronization with full history tracking.

## Monorepo Structure

| Path                  | Description                                    |
| --------------------- | ---------------------------------------------- |
| `apps/backend`        | Go backend API (`cmd/`, `internal/`). Also holds the legacy NestJS source in `src/` (history only, see below) |
| `apps/frontend`       | React + Vite SPA                               |
| `apps/rancher-hub-ui` | Git submodule — frontend rewritten with new UI |

## Tech Stack

### Backend (`apps/backend`)
- **Language & Runtime**: Go 1.26
- **Web Framework**: Gin (`gin-gonic/gin`)
- **ORM**: GORM (`gorm.io/gorm`)
- **Databases**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT (`golang-jwt/jwt/v5`), bcrypt, TOTP/OTP (`pquerna/otp`)
- **Kubernetes**: Official `k8s.io/client-go` for cluster operations
- **Entry point**: `cmd/server/main.go`

### Backend history: NestJS → Go

| Period | Backend | Where |
| --- | --- | --- |
| up to 2026-05-20 | NestJS + TypeORM (TypeScript) | last NestJS-only commit `ab3dd47` (2026-04-14); branch `origin/nodejs` forks from it |
| from 2026-05-20 | Go + Gin + GORM | commit `db350f2` "convert to go lang", merged to `main` via PR #1 (`6c8a919`) the same day |

- **Go is the only supported backend.** All new work goes in `cmd/` and `internal/`.
- The NestJS source is **kept in `apps/backend/src/` (plus `test/`, `nest-cli.json`, `tsconfig.json`, `.eslintrc.js`, `healthcheck.js`, `reset-admin-password.js`) as historical reference only**. It is not built, tested, or deployed from `main`.
- It cannot be built from `main`: `apps/backend/package.json` now contains only Go scripts (no NestJS dependencies). To run the old backend, check out `ab3dd47` or branch `origin/nodejs`.
- Do not "fix" or extend files under `apps/backend/src/`; port behavior to Go instead. The Go API is intended to stay route-compatible with the old NestJS API.

### Frontend (`apps/frontend`)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7
- **UI Library**: Ant Design 5 + Tailwind CSS 3
- **State Management**: Zustand + React Query (TanStack Query v4)
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **SSG**: `vite-react-ssg` for static site generation

### DevOps & Tooling
- **Package Manager**: pnpm (`pnpm-workspace.yaml`, `pnpm-lock.yaml`) for the frontend and in the Docker build; root scripts are invoked with `npm run`; Go modules in backend
- **Containerization**: Docker (`Dockerfile.backend`, `Dockerfile.frontend`)
- **CI/CD**: GitHub Actions — `docker-builds.yml` (push/PR on `main` only; builds/pushes the Go backend `rancher-hub-go` and the frontend images), `docker-build-legacy-nestjs.yml` (manual only; rebuilds the legacy NestJS image `rancher-hub-backend:legacy` from a historical ref) and `jekyll-docs.yml` (publishes `docs/`). There is currently no test/lint workflow. `apps/rancher-hub-ui` is intentionally not built by CI for now.
- **Docker Compose profiles**: `docker compose --profile current up` (Go) or `--profile legacy up` (NestJS); without a profile no backend starts.
- **Monorepo Orchestration**: Nx (`nx` 22.2.3), `concurrently` for local dev

## Key Scripts (root `package.json`)

```bash
npm run dev          # Start backend + frontend concurrently
npm run dev:backend  # `go run -tags=nomsgpack ./cmd/server`
npm run dev:frontend # `vite` (in apps/frontend)
npm run build        # Build both backend and frontend
npm run test         # Run Go tests + Jest tests
npm run lint         # `gofmt` + ESLint
```

## Architecture Notes
- The backend exposes a REST API consumed by the React SPA.
- Real-time data updates are handled via React Query caching and polling.
- The `rancher-hub-ui` submodule is a Git submodule (commit `082eac7`) containing a frontend rewrite with a new UI.
- SQLite is used for local development; PostgreSQL is targeted for production deployments.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **RancherHub** (8950 symbols, 20589 relationships, 556 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/RancherHub/context` | Codebase overview, check index freshness |
| `gitnexus://repo/RancherHub/clusters` | All functional areas |
| `gitnexus://repo/RancherHub/processes` | All execution flows |
| `gitnexus://repo/RancherHub/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
