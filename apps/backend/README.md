# Rancher Hub Backend

Go backend service for managing and synchronizing services across different Rancher environments.

## Quick Start

```bash
docker run -d \
  --name rancher-hub-backend \
  -p 3000:3000 \
  -v rancher-hub-data:/app/data \
  thanhtunguet/rancher-hub-go:latest
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_PATH` | SQLite database path | `/app/data/rancher-hub.db` |
| `DATABASE_TYPE` | Database driver: `sqlite` or `postgres` | `sqlite` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_NAME` | PostgreSQL database | `rancher_hub` |
| `DATABASE_USERNAME` | PostgreSQL username | `rancher_hub` |
| `DATABASE_PASSWORD` | PostgreSQL password | `rancher_hub_password` |
| `DATABASE_SSL` | Enable PostgreSQL SSL | `false` |
| `JWT_SECRET` | JWT signing secret | development default |

## Volumes

- `/app/data` - Database and persistent data storage

## Health Check

The container includes a health check endpoint at `/health`:

```bash
curl http://localhost:3000/health
```

## API Documentation

Access the OpenAPI documentation at:
```bash
http://localhost:3000/api/docs
```

## Features

- **Service Management**: View and manage services across Rancher environments
- **Environment Sync**: Synchronize service configurations between environments
- **Sync History**: Track all synchronization operations with detailed logs
- **Multi-cluster Support**: Connect to multiple Rancher sites and clusters

## Architecture

- **Framework**: Go with Gin
- **Database**: SQLite/PostgreSQL with GORM
- **API**: RESTful API compatible with the previous NestJS routes
- **Security**: Non-root container execution, input validation

## History: NestJS → Go

This backend was originally written in NestJS + TypeORM. It was rewritten in Go on **2026-05-20** (commit `db350f2`, PR #1). The Go code in `cmd/` and `internal/` is the only supported implementation.

The NestJS source (`src/`, `test/`, `nest-cli.json`, `tsconfig.json`, `.eslintrc.js`, `healthcheck.js`, `reset-admin-password.js`) is **kept for historical reference only**:

- it is not built, tested, or deployed from `main`;
- `package.json` in this directory now only contains Go scripts, so the NestJS code cannot be built from here;
- to run the last NestJS version, check out commit `ab3dd47` (2026-04-14) or the `nodejs` branch;
- to rebuild its Docker image (`thanhtunguet/rancher-hub-backend:legacy`), run the manual GitHub Actions workflow **Docker Build (legacy NestJS backend)**;
- to run it with Docker Compose, use `docker compose --profile legacy up -d` (the default `latest` tag is the last NestJS build published before the migration).

## Production Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    image: thanhtunguet/rancher-hub-go:latest
    container_name: rancher-hub-backend
    restart: unless-stopped
    environment:
      - PORT=3000
      - DATABASE_PATH=/app/data/rancher-hub.db
    volumes:
      - backend_data:/app/data
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  backend_data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rancher-hub-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rancher-hub-backend
  template:
    metadata:
      labels:
        app: rancher-hub-backend
    spec:
      containers:
      - name: backend
        image: thanhtunguet/rancher-hub-go:latest
        ports:
        - containerPort: 3000
        env:
        volumeMounts:
        - name: data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: rancher-hub-data
```

## Tags

Image: `thanhtunguet/rancher-hub-go` (built by `.github/workflows/docker-builds.yml` on every push to `main`).

- `latest` - Multi-arch (amd64 + arm64) build of the latest `main`
- `sha-<commit>` - Multi-arch build of a specific commit
- `amd64`, `arm64`, `amd64-sha-<commit>`, `arm64-sha-<commit>` - Per-architecture images

The legacy NestJS image (`thanhtunguet/rancher-hub-backend`) is no longer built automatically; see [History](#history-nestjs--go).

## Source Code

Source code is available at: [GitHub Repository](https://github.com/thanhtunguet/RancherHub)

## License

MIT License
