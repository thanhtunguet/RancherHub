# Rancher Hub Backend

Go backend service for managing and synchronizing services across different Rancher environments.

## Quick Start

```bash
docker run -d \
  --name rancher-hub-backend \
  -p 3000:3000 \
  -v rancher-hub-data:/app/data \
  thanhtunguet/rancher-hub-backend:latest
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

## Production Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    image: thanhtunguet/rancher-hub-backend:latest
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
        image: thanhtunguet/rancher-hub-backend:latest
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

- `latest` - Latest build from main branch
- `stable` - Latest stable release
- `v1.0.0` - Specific version tags
- `main` - Development builds from main branch

## Source Code

Source code is available at: [GitHub Repository](https://github.com/thanhtunguet/RancherHub)

## License

MIT License
