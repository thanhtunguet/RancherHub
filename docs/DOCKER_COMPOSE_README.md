# Docker Compose Setup for RancherHub

This docker-compose.yml file sets up a complete RancherHub environment with:

- **PostgreSQL Database**: Persistent data storage
- **Backend API**: NestJS application with PostgreSQL
- **Frontend**: React application served by nginx
- **Nginx Reverse Proxy**: Routes `/api/*` to backend and `/*` to frontend

## Quick Start

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f
   ```

3. **Access the application**:
   - Frontend: http://localhost:8080
   - API: http://localhost:8080/api
   - API Docs: http://localhost:8080/api/docs

## Services

### PostgreSQL Database
- **Port**: 5432 (exposed for development)
- **Database**: rancher_hub
- **User**: rancher_hub
- **Password**: rancher_hub_password
- **Volume**: postgres_data (persistent)

### Backend API
- **Port**: 3000 (internal)
- **Health Check**: Built-in health check
- **Dependencies**: Waits for PostgreSQL to be healthy
- **Environment**: Production-ready configuration

### Frontend
- **Port**: 80 (internal)
- **Served by**: nginx
- **Build**: React application

### Nginx Reverse Proxy
- **Port**: 8080 (exposed)
- **Routes**:
  - `/api/*` → Backend (port 3000)
  - `/*` → Frontend (port 80)
- **Features**: Gzip compression, caching, rate limiting

## Environment Variables

The backend uses these environment variables:

```bash
DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=rancher_hub
DATABASE_USERNAME=rancher_hub
DATABASE_PASSWORD=rancher_hub_password
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:8080
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## Database Migration

The backend will automatically:
- Create tables in development (synchronize: true)
- Run migrations in production (migrationsRun: true)

## Security Features

- Rate limiting on API endpoints
- Stricter rate limiting on auth endpoints
- Security headers
- CORS configuration
- Health checks for all services

## Development

For development, you can:

1. **Run individual services**:
   ```bash
   docker-compose up postgres backend
   ```

2. **Rebuild services**:
   ```bash
   docker-compose build backend
   docker-compose up -d backend
   ```

3. **View service logs**:
   ```bash
   docker-compose logs backend
   docker-compose logs postgres
   ```

## Production Considerations

1. **Change default passwords** in docker-compose.yml
2. **Set strong JWT_SECRET**
3. **Configure SSL/TLS** in nginx
4. **Set up proper backup** for postgres_data volume
5. **Configure monitoring** and logging
6. **Use secrets management** for sensitive data

## Troubleshooting

1. **Database connection issues**: Check if postgres service is healthy
2. **Backend not starting**: Check logs for database connection errors
3. **Frontend not loading**: Check nginx configuration and frontend build
4. **Port conflicts**: Change exposed ports in docker-compose.yml
