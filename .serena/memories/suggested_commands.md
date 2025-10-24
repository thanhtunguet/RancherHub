# Rancher Hub - Suggested Commands

## Development Commands

### Start Development Servers
```bash
# Start both frontend and backend concurrently
npm run dev

# Start backend only (port 3000)
npm run dev:backend
# OR
cd apps/backend && npm run start:dev

# Start frontend only (port 5173)  
npm run dev:frontend
# OR
cd apps/frontend && npm run dev
```

### Build Commands
```bash
# Build both applications
npm run build

# Build backend only
npm run build:backend
# OR
cd apps/backend && npm run build

# Build frontend only
npm run build:frontend
# OR
cd apps/frontend && npm run build
```

### Testing Commands
```bash
# Run tests for both applications
npm run test

# Backend tests
npm run test:backend
# OR
cd apps/backend && npm run test

# Frontend tests
npm run test:frontend
# OR
cd apps/frontend && npm run test

# Backend test variations
cd apps/backend && npm run test:watch    # Watch mode
cd apps/backend && npm run test:cov     # With coverage
cd apps/backend && npm run test:e2e     # End-to-end tests
```

### Linting & Formatting
```bash
# Lint both applications
npm run lint

# Backend linting
npm run lint:backend
# OR
cd apps/backend && npm run lint

# Frontend linting  
npm run lint:frontend
# OR
cd apps/frontend && npm run lint

# Backend formatting
cd apps/backend && npm run format
```

### Development URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

### System Commands (macOS/Darwin)
- `ls` - List directory contents
- `cd` - Change directory
- `grep` - Search text patterns
- `find` - Find files/directories
- `git` - Git version control
- `npm` - Package management
- `node` - Run Node.js

### Docker Commands (Alternative)
```bash
# Start with Docker Compose
docker-compose up --build

# Services available:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
# - PostgreSQL: localhost:5432
```