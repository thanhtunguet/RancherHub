# Rancher Hub - Code Style & Conventions

## Project Structure
```
rancher-hub/
├── apps/
│   ├── backend/          # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules (sites, environments, app-instances, services)
│   │   │   ├── entities/ # Database entities  
│   │   │   ├── services/ # Shared services (RancherApiService)
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── rancher-hub.db
│   └── frontend/         # React frontend
│       └── src/
│           ├── components/ # UI components by feature
│           ├── hooks/     # React Query hooks
│           ├── services/  # API client
│           ├── stores/    # Zustand stores
│           ├── types/     # TypeScript definitions
│           ├── pages/     # Route components
│           └── utils/     # Utility functions
```

## TypeScript Configuration
- **Base config**: Shared tsconfig.base.json
- **Backend**: CommonJS modules, path aliases with "@/*"
- **Frontend**: ESNext modules with bundler resolution, React JSX, strict mode
- **Strict typing**: Both projects use strict TypeScript settings

## ESLint Rules
### Backend (.eslintrc.js)
- TypeScript recommended rules
- Prettier integration
- Interface name prefix disabled
- Explicit return types disabled for flexibility
- No explicit any allowed for rapid development

### Frontend (.eslintrc.cjs)
- TypeScript + React hooks recommended
- React refresh plugin for hot reload
- Unused vars as warnings (not errors)
- No explicit any allowed

## Naming Conventions
- **Files**: kebab-case (e.g., `app-instances.module.ts`)
- **Directories**: kebab-case (e.g., `app-instances/`)
- **Classes**: PascalCase (e.g., `RancherSite`)
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase without "I" prefix
- **Types**: PascalCase with "Type" suffix when needed

## Module Organization
- **Backend**: Feature modules following NestJS conventions
- **Frontend**: Feature-based component organization
- **Shared**: Common types and utilities
- **Path aliases**: Both use "@/*" for src imports

## Database Conventions
- **Entities**: PascalCase class names, camelCase properties
- **Tables**: Automatic table naming by TypeORM
- **Relations**: Proper TypeORM decorators and foreign keys