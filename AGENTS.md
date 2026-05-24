# RancherHub — Project Overview

RancherHub is a Service Sync Manager for managing and synchronizing services across different environments in Rancher Kubernetes clusters. It provides a unified dashboard for DevOps teams to connect multiple Rancher instances, organize applications by environment (Dev, Staging, Production), and perform service synchronization with full history tracking.

## Monorepo Structure

| Path                  | Description                                    |
| --------------------- | ---------------------------------------------- |
| `apps/backend`        | Go backend API (migrated from NestJS)          |
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

> **Note**: The backend was originally built with NestJS + TypeORM and has been fully migrated to Go. Legacy NestJS code is no longer present.

### Frontend (`apps/frontend`)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7
- **UI Library**: Ant Design 5 + Tailwind CSS 3
- **State Management**: Zustand + React Query (TanStack Query v4)
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **SSG**: `vite-react-ssg` for static site generation

### DevOps & Tooling
- **Package Manager**: npm (workspaces) at root; Go modules in backend
- **Containerization**: Docker (`Dockerfile.backend`, `Dockerfile.frontend`)
- **CI/CD**: GitHub Actions
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

---

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **RancherHub** (6730 symbols, 15570 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource                                    | Use for                                  |
| ------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/RancherHub/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/RancherHub/clusters`       | All functional areas                     |
| `gitnexus://repo/RancherHub/processes`      | All execution flows                      |
| `gitnexus://repo/RancherHub/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->