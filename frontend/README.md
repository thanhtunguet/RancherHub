# Rancher Hub Frontend

A React-based web interface for managing and synchronizing services across different Rancher environments.

## Quick Start

```bash
docker run -d \
  --name rancher-hub-frontend \
  -p 80:80 \
  -e BACKEND_URL=http://localhost:3000 \
  thanhtunguet/rancher-hub-frontend:latest
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | Backend API URL | `http://localhost:3000` |

## Features

- **Intuitive Dashboard**: Clean, modern interface for service management
- **Environment Management**: Create and organize Dev/Staging/Production environments
- **Service Synchronization**: Easy-to-use sync workflow between environments
- **Sync History**: Detailed history with filtering and search capabilities
- **Multi-cluster Support**: Manage services across multiple Rancher clusters
- **Real-time Updates**: Live data updates with React Query

## Architecture

- **Framework**: React 18 with TypeScript
- **Package Manager**: Yarn for dependency management
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Ant Design with Tailwind CSS
- **State Management**: Zustand for global state
- **Data Fetching**: React Query for server state management
- **Web Server**: Nginx with optimized configuration

## Production Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    image: thanhtunguet/rancher-hub-frontend:latest
    container_name: rancher-hub-frontend
    restart: unless-stopped
    environment:
      - BACKEND_URL=http://backend:3000
    ports:
      - "80:80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rancher-hub-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rancher-hub-frontend
  template:
    metadata:
      labels:
        app: rancher-hub-frontend
    spec:
      containers:
      - name: frontend
        image: thanhtunguet/rancher-hub-frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: BACKEND_URL
          value: "http://rancher-hub-backend-service:3000"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rancher-hub-frontend-service
spec:
  selector:
    app: rancher-hub-frontend
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

### Nginx Configuration

The container includes optimized Nginx configuration with:

- **Gzip Compression**: Reduces bandwidth usage
- **Static Asset Caching**: Improves performance
- **Security Headers**: XSS protection, content type validation
- **SPA Routing**: Proper handling of client-side routes
- **API Proxy**: Seamless integration with backend

## Health Check

The container includes a health check endpoint at `/health`:

```bash
curl http://localhost:80/health
```

## Runtime Configuration

The frontend supports runtime configuration through environment variables:

1. **API URL Configuration**: Set `BACKEND_URL` to point to your backend
2. **Reverse Proxy**: API calls are automatically proxied through Nginx
3. **Hot Reloading**: Environment changes apply without rebuilding

## Security Features

- **Non-root Execution**: Container runs as nginx user
- **Security Headers**: CORS, XSS protection, content security policy
- **Static Asset Optimization**: Minified and compressed assets
- **Input Validation**: Form validation and sanitization

## Performance Optimizations

- **Code Splitting**: Lazy loading of routes and components
- **Asset Optimization**: Minified CSS/JS with tree shaking
- **Caching Strategy**: Aggressive caching for static assets
- **Compression**: Gzip compression for all text assets

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Tags

- `latest` - Latest build from main branch
- `stable` - Latest stable release
- `v1.0.0` - Specific version tags
- `main` - Development builds from main branch

## Source Code

Source code is available at: [GitHub Repository](https://github.com/thanhtunguet/RancherHub)

## License

MIT License