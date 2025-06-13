# Rancher Hub - Production Deployment Guide

This guide covers deploying Rancher Hub in production using Docker containers.

## Overview

The production setup includes:
- **Backend**: NestJS API with Yarn package management and optimized build
- **Frontend**: React SPA built with Yarn, served by Nginx with reverse proxy and caching
- **Database**: SQLite with persistent volume mounting
- **Security**: Non-root users, health checks, and security headers

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd RancherHub
   ```

2. **Deploy with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs

### Manual Docker Build

#### Backend

```bash
cd backend
docker build -t rancher-hub-backend:latest .
docker run -d \
  --name rancher-hub-backend \
  -p 3000:3000 \
  -v rancher-hub-data:/app/data \
  -e NODE_ENV=production \
  rancher-hub-backend:latest
```

#### Frontend

```bash
cd frontend
docker build -t rancher-hub-frontend:latest .
docker run -d \
  --name rancher-hub-frontend \
  -p 80:80 \
  -e BACKEND_URL=http://localhost:3000 \
  rancher-hub-frontend:latest
```

## Configuration

### Environment Variables

#### Backend
- `NODE_ENV`: Set to `production`
- `PORT`: API server port (default: 3000)
- `DATABASE_PATH`: SQLite database file path (default: `/app/data/rancher-hub.db`)

#### Frontend
- `BACKEND_URL`: Backend API URL (default: `http://localhost:3000`)

### Production Environment Example

```bash
# Backend
NODE_ENV=production
PORT=3000
DATABASE_PATH=/app/data/rancher-hub.db

# Frontend
BACKEND_URL=https://api.yourdomain.com
```

## Docker Images Details

### Backend Image Features
- **Multi-stage build**: Separates build and runtime environments
- **Minimal runtime**: Only production dependencies
- **Non-root user**: Runs as `nestjs` user for security
- **Health checks**: Built-in health monitoring
- **Optimized layers**: Cached dependency installation

### Frontend Image Features
- **Nginx-based**: High-performance static file serving
- **Reverse proxy**: API calls proxied to backend
- **Gzip compression**: Optimized asset delivery
- **Security headers**: CORS, XSS protection, etc.
- **Runtime configuration**: Environment-based API URL substitution

## Deployment Strategies

### 1. Single Server Deployment
Use `docker-compose.prod.yml` for simple single-server deployments.

### 2. Load Balanced Deployment
For high availability, deploy multiple backend instances:

```yaml
version: '3.8'
services:
  backend:
    # ... backend config
    deploy:
      replicas: 3
  
  nginx-lb:
    image: nginx:alpine
    # Configure as load balancer
```

### 3. Kubernetes Deployment
For container orchestration, use Kubernetes manifests:

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
        image: rancher-hub-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: rancher-hub-data
```

## Monitoring and Logs

### Health Checks
- Backend: `GET /health`
- Frontend: `GET /health`

### Container Logs
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Individual service logs
docker logs rancher-hub-backend
docker logs rancher-hub-frontend
```

### Monitoring Commands
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats rancher-hub-backend rancher-hub-frontend
```

## Data Persistence

### Database Backup
```bash
# Create backup
docker exec rancher-hub-backend cp /app/data/rancher-hub.db /app/data/backup-$(date +%Y%m%d).db

# Copy backup to host
docker cp rancher-hub-backend:/app/data/backup-$(date +%Y%m%d).db ./
```

### Volume Management
```bash
# List volumes
docker volume ls

# Backup volume
docker run --rm -v rancher-hub_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# Restore volume
docker run --rm -v rancher-hub_backend_data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /
```

## Security Considerations

### Container Security
- ✅ Non-root users in both containers
- ✅ Minimal base images (Alpine Linux)
- ✅ No unnecessary packages installed
- ✅ Read-only root filesystem where possible

### Network Security
- ✅ Internal network isolation
- ✅ Only necessary ports exposed
- ✅ Security headers in Nginx
- ✅ API proxy configuration

### Application Security
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Rate limiting (configure in reverse proxy)
- ✅ HTTPS termination (configure in reverse proxy)

## Troubleshooting

### Common Issues

#### Backend won't start
```bash
# Check logs
docker logs rancher-hub-backend

# Check database permissions
docker exec rancher-hub-backend ls -la /app/data/
```

#### Frontend can't connect to backend
```bash
# Check network connectivity
docker exec rancher-hub-frontend curl http://backend:3000/health

# Verify environment variables
docker exec rancher-hub-frontend env | grep BACKEND_URL
```

#### Database corruption
```bash
# Check database integrity
docker exec rancher-hub-backend sqlite3 /app/data/rancher-hub.db "PRAGMA integrity_check;"
```

### Performance Tuning

#### Nginx Configuration
Edit `frontend/nginx.conf`:
- Adjust worker processes
- Tune gzip compression
- Configure caching headers

#### Node.js Configuration
Set environment variables:
```bash
NODE_OPTIONS="--max-old-space-size=2048"
UV_THREADPOOL_SIZE=128
```

## Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Rolling Updates
```bash
# Update backend only
docker-compose -f docker-compose.prod.yml up -d --no-deps backend

# Update frontend only
docker-compose -f docker-compose.prod.yml up -d --no-deps frontend
```

## Support

For production support and issues:
1. Check container logs
2. Verify health endpoints
3. Review configuration
4. Check resource usage

## License

This deployment configuration is part of the Rancher Hub project.