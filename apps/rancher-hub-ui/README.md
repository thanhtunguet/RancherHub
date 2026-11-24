# Rancher Hub Control

Rancher Hub Control is a React + TypeScript admin dashboard for managing Rancher Hub resources and operations.

## Tech stack

- Vite
- React 18
- TypeScript
- React Router
- TanStack Query
- Axios
- Tailwind CSS + shadcn/ui components
- Vitest + Testing Library

## Features

- Authentication flow with protected routes
- Dashboard and operational pages for:
  - Sites
  - Environments
  - Harbor sites/browser
  - Generic clusters
  - App instances
  - Services
  - ConfigMaps
  - Secrets
  - Sync history
  - Monitoring and templates
  - Users, profile, trusted devices, settings
- Configurable API base URL stored in browser local storage
- Token-based API access via Axios interceptors

## Prerequisites

- Node.js 20+
- npm

## Getting started

```bash
npm install
npm run dev
```

The app will start with Vite dev server (default: `http://localhost:5173`).

## Available scripts

- `npm run dev` — Start development server
- `npm run build` — Build production bundle
- `npm run build:dev` — Build with development mode
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint
- `npm run test` — Run tests once (Vitest)
- `npm run test:watch` — Run tests in watch mode

## Environment configuration

Use `VITE_API_BASE_URL` to set API base URL at build/runtime for the frontend.

Example:

```bash
VITE_API_BASE_URL=https://api.example.com npm run dev
```

The app also stores runtime config in local storage under `rancherhub_config`.

## Docker

Build and run with Docker:

```bash
docker build -t rancher-hub-control .
docker run --rm -p 8080:80 rancher-hub-control
```

Then open `http://localhost:8080`.

## Project structure

```text
src/
  api/            # API client and shared API types
  components/     # Reusable UI and layout components
  contexts/       # React context providers (e.g. auth)
  hooks/          # Custom React hooks
  pages/          # Route-level pages
  repositories/   # Data access wrappers per resource
  test/           # Test setup and specs
```
