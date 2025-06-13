# Claude Development Context

## Project Overview
**Rancher Hub** - Service Sync Manager for managing and synchronizing services across different environments in Rancher clusters.

## Current Status
- **Phase**: MVP (Phase 1) ✅ COMPLETED
- **Version**: 1.0.0
- **Last Updated**: June 13, 2025

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Ant Design + Zustand + React Query
- **Backend**: NestJS + TypeScript + TypeORM + SQLite + Swagger
- **Development**: Both frontend and backend running in watch mode

## Development Commands
```bash
# Start backend development server (port 3000)
cd backend && npm run start:dev

# Start frontend development server (port 5173)
cd frontend && npm run dev

# Build projects
cd backend && npm run build
cd frontend && npm run build

# Run linting
cd backend && npm run lint
cd frontend && npm run lint
```

## Key Endpoints
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

## Project Structure
```
rancher-hub/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── sites/      # Rancher site management
│   │   │   ├── environments/ # Environment management
│   │   │   ├── app-instances/ # App instance management
│   │   │   └── services/   # Service & sync management
│   │   ├── entities/       # Database entities
│   │   └── services/       # Shared services (RancherApiService)
│   └── rancher-hub.db      # SQLite database
├── frontend/               # React frontend
│   └── src/
│       ├── components/     # UI components by feature
│       ├── hooks/         # React Query hooks
│       ├── services/      # API client
│       ├── stores/        # Zustand stores
│       └── types/         # TypeScript definitions
└── docs/                  # Documentation
```

## Implementation Status

### ✅ Completed Features
1. **Sites Management** - Connect to multiple Rancher instances with API tokens
2. **Environment Management** - Create and organize Dev/Staging/Production environments
3. **App Instance Management** - Link environments to specific Rancher clusters/namespaces
4. **Service Management** - View services from configured app instances with filtering
5. **Service Synchronization** - Complete sync workflow between environments with history

### 🔧 Recent Fixes
1. **Rancher API Integration** - Fixed 404 errors with multiple endpoint strategy
2. **UI Issues** - Fixed cluster dropdown overflow and namespace loading
3. **Complete Workflow** - Full end-to-end user journey now functional

### 📋 Next Phase (Phase 2)
1. Advanced service filtering and search
2. Service comparison between environments  
3. Batch synchronization operations
4. Rollback capabilities for failed syncs
5. Dashboard analytics and metrics

## Database Schema
- **RancherSite**: Rancher server connections
- **Environment**: Environment organization (Dev/Staging/Prod)
- **AppInstance**: Links environments to cluster/namespace
- **Service**: Workloads with sync status
- **SyncOperation**: Synchronization records
- **SyncHistory**: Detailed sync audit trail

## Development Notes
- Uses SQLite for development, PostgreSQL ready for production
- All APIs documented with Swagger/OpenAPI
- Real-time updates with React Query caching
- Comprehensive error handling and logging
- Mock data available for development without real Rancher

## Known Issues
- None blocking - all MVP features working

## Testing
- Both backend and frontend build successfully
- All TypeScript compilation passes
- API endpoints tested and functional
- UI components rendering correctly

## For Future Sessions
- Continue with Phase 2 implementation
- Test with real Rancher instances
- Performance optimization for large environments
- Enhanced UX and error handling