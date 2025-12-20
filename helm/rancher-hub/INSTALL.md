# Quick Installation Guide

## Quick Start (5 minutes)

### 1. Install with default settings

```bash
# Create namespace
kubectl create namespace rancher-hub

# Install the chart
helm install rancher-hub ./helm/rancher-hub -n rancher-hub

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=rancher-hub -n rancher-hub --timeout=300s
```

### 2. Access the application

```bash
# Port forward to access frontend
kubectl port-forward -n rancher-hub svc/rancher-hub-frontend 8080:80

# Open http://localhost:8080 in your browser
# Login with: admin / admin123
```

### 3. Access API documentation

```bash
# Port forward to access backend API
kubectl port-forward -n rancher-hub svc/rancher-hub-backend 3000:3000

# Open http://localhost:3000/api/docs in your browser
```

## Production Installation

### 1. Generate secrets

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 48)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32)

echo "JWT_SECRET: $JWT_SECRET"
echo "DB_PASSWORD: $DB_PASSWORD"
```

### 2. Create values file

Create `my-values.yaml`:

```yaml
postgresql:
  auth:
    password: "YOUR_DB_PASSWORD_HERE"
  persistence:
    storageClass: "your-storage-class"
    size: 20Gi

backend:
  replicaCount: 2
  image:
    tag: "1.0.0"
  env:
    frontendUrl: "https://rancher-hub.yourdomain.com"
  secrets:
    jwtSecret: "YOUR_JWT_SECRET_HERE"

frontend:
  replicaCount: 2
  image:
    tag: "1.0.0"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: rancher-hub.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
          backend: frontend
        - path: /api
          pathType: Prefix
          backend: backend
  tls:
    - secretName: rancher-hub-tls
      hosts:
        - rancher-hub.yourdomain.com
```

### 3. Install

```bash
helm install rancher-hub ./helm/rancher-hub \
  -n rancher-hub \
  --create-namespace \
  -f my-values.yaml
```

## Using External PostgreSQL

```bash
helm install rancher-hub ./helm/rancher-hub \
  --set postgresql.enabled=false \
  --set backend.env.database.host=postgres.example.com \
  --set backend.env.database.port=5432 \
  --set backend.env.database.name=rancher_hub \
  --set backend.env.database.username=rancher_hub \
  --set backend.env.database.password=YOUR_PASSWORD
```

## Verify Installation

```bash
# Check all resources
kubectl get all -n rancher-hub

# Check pods status
kubectl get pods -n rancher-hub

# View logs
kubectl logs -n rancher-hub -l app.kubernetes.io/component=backend --tail=50
```

## Uninstall

```bash
# Uninstall release
helm uninstall rancher-hub -n rancher-hub

# Delete PVCs (WARNING: This deletes all data!)
kubectl delete pvc -n rancher-hub -l app.kubernetes.io/instance=rancher-hub

# Delete namespace
kubectl delete namespace rancher-hub
```

## Need Help?

See the full documentation:
- [README.md](./README.md) - Complete configuration reference
- [../DEPLOYMENT.md](../DEPLOYMENT.md) - Detailed deployment guide
- [GitHub](https://github.com/thanhtunguet/RancherHub) - Source code and issues
