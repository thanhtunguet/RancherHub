# Rancher Hub - Helm Deployment Guide

This guide provides step-by-step instructions for deploying Rancher Hub using Helm.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Production Deployment](#production-deployment)
- [Configuration Examples](#configuration-examples)
- [Post-Deployment](#post-deployment)
- [Upgrading](#upgrading)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

```bash
# Verify Kubernetes cluster access
kubectl cluster-info

# Verify Helm installation
helm version

# Check available storage classes
kubectl get storageclass
```

### Minimum Requirements

- Kubernetes 1.19 or later
- Helm 3.2.0 or later
- Available storage (for PostgreSQL persistence)
- Ingress controller (optional, for production)
- cert-manager (optional, for automatic TLS certificates)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/thanhtunguet/RancherHub.git
cd RancherHub
```

### 2. Install with Default Values (Development)

```bash
# Create namespace
kubectl create namespace rancher-hub

# Install the chart
helm install rancher-hub ./helm/rancher-hub \
  --namespace rancher-hub

# Watch the deployment
kubectl get pods -n rancher-hub -w
```

### 3. Access the Application

```bash
# Port forward to access the frontend
kubectl port-forward -n rancher-hub svc/rancher-hub-frontend 8080:80

# Open browser to http://localhost:8080
# Default credentials: admin / admin123
```

## Production Deployment

### 1. Prepare Secrets

Create a file `production-secrets.yaml`:

```yaml
postgresql:
  auth:
    password: "your-strong-postgres-password-here"

backend:
  secrets:
    jwtSecret: "your-random-64-character-jwt-secret-here"
```

Generate a random JWT secret:

```bash
# Linux/macOS
openssl rand -base64 48

# Or use this one-liner
kubectl create secret generic rancher-hub-backend-secret \
  --from-literal=jwt-secret=$(openssl rand -base64 48) \
  --from-literal=database-password=YOUR_DB_PASSWORD \
  --dry-run=client -o yaml | kubectl apply -n rancher-hub -f -
```

### 2. Customize Production Values

Create `my-production-values.yaml`:

```yaml
# Use production configuration as base
postgresql:
  persistence:
    storageClass: "your-storage-class"
    size: 20Gi

backend:
  replicaCount: 2
  image:
    tag: "1.0.0"
  env:
    frontendUrl: "https://rancher-hub.yourdomain.com"

frontend:
  replicaCount: 2
  image:
    tag: "1.0.0"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
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

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
```

### 3. Deploy to Production

```bash
# Install with production configuration
helm install rancher-hub ./helm/rancher-hub \
  --namespace rancher-hub \
  --create-namespace \
  --values ./helm/rancher-hub/values-production.yaml \
  --values my-production-values.yaml \
  --values production-secrets.yaml

# Verify deployment
helm status rancher-hub -n rancher-hub
kubectl get pods -n rancher-hub
```

## Configuration Examples

### Using External PostgreSQL Database

```yaml
# external-db-values.yaml
postgresql:
  enabled: false

backend:
  env:
    database:
      type: postgres
      host: postgres.example.com
      port: 5432
      name: rancher_hub
      username: rancher_hub
      password: your-password  # Better: use existingSecret
      ssl: true
```

Deploy:

```bash
helm install rancher-hub ./helm/rancher-hub \
  --values external-db-values.yaml
```

### High Availability Setup

```yaml
# ha-values.yaml
backend:
  replicaCount: 3
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app.kubernetes.io/component
                  operator: In
                  values:
                    - backend
            topologyKey: kubernetes.io/hostname

frontend:
  replicaCount: 3
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app.kubernetes.io/component
                  operator: In
                  values:
                    - frontend
            topologyKey: kubernetes.io/hostname

postgresql:
  persistence:
    size: 50Gi
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
```

### Custom Resource Limits

```yaml
# resource-limits.yaml
backend:
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "2Gi"
      cpu: "2000m"

frontend:
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

postgresql:
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
```

## Post-Deployment

### 1. Verify Installation

```bash
# Check all resources
kubectl get all -n rancher-hub

# Check persistent volumes
kubectl get pvc -n rancher-hub

# Check ingress
kubectl get ingress -n rancher-hub

# View logs
kubectl logs -n rancher-hub -l app.kubernetes.io/component=backend --tail=50
```

### 2. Initial Setup

1. Access the application through ingress URL or port-forward
2. Login with default credentials (admin/admin123)
3. **Immediately change the default password**
4. Set up 2FA for security
5. Configure Rancher sites
6. Configure Harbor registries (if needed)

### 3. Configure Monitoring (Optional)

If using Prometheus/Grafana:

```bash
# Add ServiceMonitor for Prometheus
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rancher-hub-backend
  namespace: rancher-hub
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: backend
  endpoints:
    - port: http
      path: /metrics
EOF
```

## Upgrading

### Standard Upgrade

```bash
# Update repository
git pull origin main

# Upgrade release
helm upgrade rancher-hub ./helm/rancher-hub \
  --namespace rancher-hub \
  --values my-production-values.yaml \
  --values production-secrets.yaml

# Watch rollout
kubectl rollout status deployment/rancher-hub-backend -n rancher-hub
kubectl rollout status deployment/rancher-hub-frontend -n rancher-hub
```

### Upgrade to Specific Version

```bash
helm upgrade rancher-hub ./helm/rancher-hub \
  --set backend.image.tag=1.1.0 \
  --set frontend.image.tag=1.1.0 \
  --reuse-values
```

### Rollback

```bash
# View history
helm history rancher-hub -n rancher-hub

# Rollback to previous version
helm rollback rancher-hub -n rancher-hub

# Rollback to specific revision
helm rollback rancher-hub 3 -n rancher-hub
```

## Backup and Restore

### Backup PostgreSQL Data

```bash
# Create backup
kubectl exec -n rancher-hub rancher-hub-postgresql-0 -- \
  pg_dump -U rancher_hub rancher_hub > backup-$(date +%Y%m%d).sql

# Or use a Job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-backup
  namespace: rancher-hub
spec:
  template:
    spec:
      containers:
      - name: backup
        image: postgres:15-alpine
        command:
        - sh
        - -c
        - |
          pg_dump -h rancher-hub-postgresql -U rancher_hub rancher_hub > /backup/backup-\$(date +%Y%m%d).sql
        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: rancher-hub-postgresql
              key: password
        volumeMounts:
        - name: backup
          mountPath: /backup
      volumes:
      - name: backup
        persistentVolumeClaim:
          claimName: postgres-backup-pvc
      restartPolicy: Never
EOF
```

### Restore PostgreSQL Data

```bash
# Copy backup to pod
kubectl cp backup.sql rancher-hub/rancher-hub-postgresql-0:/tmp/

# Restore
kubectl exec -n rancher-hub rancher-hub-postgresql-0 -- \
  psql -U rancher_hub rancher_hub < /tmp/backup.sql
```

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod
kubectl describe pod -n rancher-hub <pod-name>

# Check events
kubectl get events -n rancher-hub --sort-by='.lastTimestamp'

# Check logs
kubectl logs -n rancher-hub <pod-name> --previous
```

### Database Connection Issues

```bash
# Test connection from backend pod
kubectl exec -n rancher-hub -it deployment/rancher-hub-backend -- \
  sh -c 'nc -zv rancher-hub-postgresql 5432'

# Check database logs
kubectl logs -n rancher-hub rancher-hub-postgresql-0
```

### Ingress Not Working

```bash
# Check ingress
kubectl describe ingress -n rancher-hub rancher-hub

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Test internal service
kubectl run -n rancher-hub curl --rm -it --restart=Never --image=curlimages/curl -- \
  curl http://rancher-hub-frontend
```

### Certificate Issues

```bash
# Check certificate
kubectl describe certificate -n rancher-hub rancher-hub-tls

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Check certificate request
kubectl describe certificaterequest -n rancher-hub
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods -n rancher-hub

# Check HPA status
kubectl get hpa -n rancher-hub

# Scale manually if needed
kubectl scale deployment/rancher-hub-backend --replicas=3 -n rancher-hub
```

## Maintenance

### Update Dependencies

```bash
# Update Helm chart dependencies (if any)
helm dependency update ./helm/rancher-hub
```

### Clean Up

```bash
# Uninstall the release
helm uninstall rancher-hub -n rancher-hub

# Delete PVCs (WARNING: This deletes data!)
kubectl delete pvc -n rancher-hub -l app.kubernetes.io/instance=rancher-hub

# Delete namespace
kubectl delete namespace rancher-hub
```

## Additional Resources

- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Rancher Hub GitHub](https://github.com/thanhtunguet/RancherHub)
- [Rancher Hub API Documentation](http://localhost:3000/api/docs)

## Support

For issues and questions:
- GitHub Issues: https://github.com/thanhtunguet/RancherHub/issues
- Documentation: https://github.com/thanhtunguet/RancherHub/tree/main/docs
