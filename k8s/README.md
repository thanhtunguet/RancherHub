# Kubernetes Deployment for Rancher Hub

This directory contains Kubernetes manifests to deploy Rancher Hub on a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured to access your cluster
- Ingress controller installed (e.g., NGINX Ingress Controller)
- Docker images available:
  - `thanhtunguet/rancher-hub-backend:latest`
  - `thanhtunguet/rancher-hub-frontend:latest`

## Files Overview

- `namespace.yaml` - Creates the `rancher-hub` namespace
- `configmap.yaml` - Non-sensitive configuration values
- `secret.yaml` - Sensitive data (database password, JWT secret)
- `postgres.yaml` - PostgreSQL database deployment (optional if using external database)
- `backend.yaml` - Backend API deployment and service
- `frontend.yaml` - Frontend deployment and service
- `ingress.yaml` - Ingress configuration for external access

## Deployment Steps

### 1. Update Configuration

Before deploying, update the following files with your actual values:

#### `secret.yaml`
Replace the placeholder values:
- `DATABASE_PASSWORD`: Your PostgreSQL database password
- `JWT_SECRET`: A strong, random secret key for JWT token signing

You can also create the secret using kubectl:
```bash
kubectl create secret generic rancher-hub-secret \
  --from-literal=DATABASE_PASSWORD='your-db-password' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  -n rancher-hub
```

#### `configmap.yaml`
Update if needed:
- `FRONTEND_URL`: Should match your ingress host (e.g., `https://rancher-hub.example.com`)
- `DATABASE_HOST`: If using external database, update to your database host

#### `ingress.yaml`
Update the host:
- Change `rancher-hub.example.com` to your actual domain
- Uncomment TLS section if you have SSL certificates

### 2. Deploy to Kubernetes

#### Option 1: Using the deployment script (Recommended)

```bash
./k8s-deploy.sh
```

#### Option 2: Manual deployment

Deploy all resources in order:

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create ConfigMap and Secret
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml

# Deploy PostgreSQL (skip if using external database)
kubectl apply -f postgres.yaml

# Deploy Backend
kubectl apply -f backend.yaml

# Deploy Frontend
kubectl apply -f frontend.yaml

# Deploy Ingress
kubectl apply -f ingress.yaml
```

Or deploy everything at once:
```bash
kubectl apply -f .
```

### 3. Verify Deployment

Check the status of all resources:
```bash
kubectl get all -n rancher-hub
```

Check pod logs:
```bash
# Backend logs
kubectl logs -f deployment/rancher-hub-backend -n rancher-hub

# Frontend logs
kubectl logs -f deployment/rancher-hub-frontend -n rancher-hub

# PostgreSQL logs
kubectl logs -f deployment/postgres -n rancher-hub
```

### 4. Access the Application

Once the ingress is configured and DNS is pointing to your cluster, access:
- Frontend: `http://rancher-hub.example.com`
- API: `http://rancher-hub.example.com/api`
- API Docs: `http://rancher-hub.example.com/api/docs`

## Using External Database

If you're using an external PostgreSQL database instead of the included deployment:

1. Skip deploying `postgres.yaml`
2. Update `configmap.yaml`:
   - Set `DATABASE_HOST` to your external database host
   - Set `DATABASE_PORT` if different from 5432
   - Update `DATABASE_SSL` to `"true"` if your database requires SSL
3. Ensure your Kubernetes cluster can reach the external database

## Scaling

To scale the deployments:

```bash
# Scale backend
kubectl scale deployment rancher-hub-backend --replicas=3 -n rancher-hub

# Scale frontend
kubectl scale deployment rancher-hub-frontend --replicas=3 -n rancher-hub
```

## Updating Configuration

After updating ConfigMap or Secret:

```bash
# Apply changes
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml

# Restart deployments to pick up changes
kubectl rollout restart deployment/rancher-hub-backend -n rancher-hub
kubectl rollout restart deployment/rancher-hub-frontend -n rancher-hub
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n rancher-hub
kubectl logs <pod-name> -n rancher-hub
```

### Database connection issues
- Verify PostgreSQL is running: `kubectl get pods -n rancher-hub | grep postgres`
- Check database credentials in secret
- Verify network connectivity between backend and database

### Ingress not working
- Verify ingress controller is installed: `kubectl get ingressclass`
- Check ingress status: `kubectl describe ingress rancher-hub-ingress -n rancher-hub`
- Verify DNS is pointing to your ingress controller's external IP

## Cleanup

To remove all resources:
```bash
kubectl delete -f .
kubectl delete namespace rancher-hub
```

