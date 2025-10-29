# Development Context

## Project Overview
**Rancher Hub** - Service Sync Manager for managing and synchronizing services across different environments in Rancher clusters.

## Development Notes
- Uses SQLite for development, PostgreSQL ready for production
- All APIs documented with Swagger/OpenAPI
- Real-time updates with React Query caching
- Comprehensive error handling and logging
- Mock data available for development without real Rancher

## Testing

You MUST ensure:

- Both backend and frontend build successfully
- All TypeScript compilation passes
- API endpoints tested and functional
- UI components rendering correctly

## Documentation

- Keep documentation UP-TO-DATE
- Whenever you make a change or finish a task, check for @docs/CURRENT_STATUS.md and @docs/ROADMAP.md to update the technical document status and roadmap accordingly. If the changes can be see on the UI or affect backend APIs, consider asking me to allow you to update them in project README, too.
