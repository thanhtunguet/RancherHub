# Rancher Hub Helm Chart

This Helm chart deploys Rancher Hub - a Service Sync Manager for managing and synchronizing services across different environments in Rancher clusters.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure (for PostgreSQL persistence)

## Installing the Chart

### Quick Start (Development)

```bash
# Install with default values
helm install rancher-hub ./helm/rancher-hub

# Install with custom release name
helm install my-rancher-hub ./helm/rancher-hub

# Install in specific namespace
helm install rancher-hub ./helm/rancher-hub --namespace rancher-hub --create-namespace
```

### Production Installation

```bash
# Install with production values
helm install rancher-hub ./helm/rancher-hub \
  --namespace rancher-hub \
  --create-namespace \
  --values ./helm/rancher-hub/values-production.yaml \
  --set postgresql.auth.password=YOUR_SECURE_PASSWORD \
  --set backend.secrets.jwtSecret=YOUR_RANDOM_JWT_SECRET
```

### Using Existing Secrets

```bash
# Create secrets first
kubectl create secret generic rancher-hub-postgres-secret \
  --from-literal=password=YOUR_DB_PASSWORD

kubectl create secret generic rancher-hub-backend-secret \
  --from-literal=jwt-secret=YOUR_JWT_SECRET \
  --from-literal=database-password=YOUR_DB_PASSWORD

# Install with existing secrets
helm install rancher-hub ./helm/rancher-hub \
  --set postgresql.auth.existingSecret=rancher-hub-postgres-secret \
  --set backend.secrets.existingSecret=rancher-hub-backend-secret
```

## Uninstalling the Chart

```bash
helm uninstall rancher-hub
```

This removes all Kubernetes components associated with the chart and deletes the release.

**Note:** PersistentVolumeClaims are not deleted automatically. To delete them:

```bash
kubectl delete pvc -l app.kubernetes.io/instance=rancher-hub
```

## Configuration

The following table lists the configurable parameters and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imagePullSecrets` | Global Docker registry secret names | `[]` |

### PostgreSQL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL deployment | `true` |
| `postgresql.image.registry` | PostgreSQL image registry | `docker.io` |
| `postgresql.image.repository` | PostgreSQL image repository | `postgres` |
| `postgresql.image.tag` | PostgreSQL image tag | `15-alpine` |
| `postgresql.auth.database` | PostgreSQL database name | `rancher_hub` |
| `postgresql.auth.username` | PostgreSQL username | `rancher_hub` |
| `postgresql.auth.password` | PostgreSQL password | `rancher_hub_password` |
| `postgresql.auth.existingSecret` | Use existing secret for credentials | `""` |
| `postgresql.persistence.enabled` | Enable persistence | `true` |
| `postgresql.persistence.storageClass` | Storage class | `""` |
| `postgresql.persistence.size` | Storage size | `10Gi` |
| `postgresql.resources.requests.memory` | Memory request | `256Mi` |
| `postgresql.resources.requests.cpu` | CPU request | `100m` |
| `postgresql.resources.limits.memory` | Memory limit | `512Mi` |
| `postgresql.resources.limits.cpu` | CPU limit | `500m` |

### Backend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.replicaCount` | Number of backend replicas | `1` |
| `backend.image.registry` | Backend image registry | `docker.io` |
| `backend.image.repository` | Backend image repository | `thanhtunguet/rancher-hub-backend` |
| `backend.image.tag` | Backend image tag | `latest` |
| `backend.service.type` | Backend service type | `ClusterIP` |
| `backend.service.port` | Backend service port | `3000` |
| `backend.env.nodeEnv` | Node environment | `production` |
| `backend.env.frontendUrl` | Frontend URL for CORS | `http://localhost:8080` |
| `backend.secrets.jwtSecret` | JWT secret key | `""` |
| `backend.secrets.existingSecret` | Use existing secret | `""` |
| `backend.resources.requests.memory` | Memory request | `256Mi` |
| `backend.resources.requests.cpu` | CPU request | `100m` |
| `backend.resources.limits.memory` | Memory limit | `512Mi` |
| `backend.resources.limits.cpu` | CPU limit | `500m` |

### Frontend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.replicaCount` | Number of frontend replicas | `1` |
| `frontend.image.registry` | Frontend image registry | `docker.io` |
| `frontend.image.repository` | Frontend image repository | `thanhtunguet/rancher-hub-frontend` |
| `frontend.image.tag` | Frontend image tag | `latest` |
| `frontend.service.type` | Frontend service type | `ClusterIP` |
| `frontend.service.port` | Frontend service port | `80` |
| `frontend.resources.requests.memory` | Memory request | `128Mi` |
| `frontend.resources.requests.cpu` | CPU request | `50m` |
| `frontend.resources.limits.memory` | Memory limit | `256Mi` |
| `frontend.resources.limits.cpu` | CPU limit | `200m` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.hosts` | Ingress hosts configuration | See values.yaml |
| `ingress.tls` | Ingress TLS configuration | `[]` |

### Autoscaling Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable horizontal pod autoscaling | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `1` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization | `80` |
| `autoscaling.targetMemoryUtilizationPercentage` | Target memory utilization | `80` |

## Examples

### Using External PostgreSQL Database

```bash
helm install rancher-hub ./helm/rancher-hub \
  --set postgresql.enabled=false \
  --set backend.env.database.host=external-postgres.example.com \
  --set backend.env.database.port=5432 \
  --set backend.env.database.name=rancher_hub \
  --set backend.env.database.username=rancher_hub \
  --set backend.env.database.password=YOUR_PASSWORD
```

### Enabling Ingress with Let's Encrypt

```bash
helm install rancher-hub ./helm/rancher-hub \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.hosts[0].host=rancher-hub.example.com \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set ingress.tls[0].secretName=rancher-hub-tls \
  --set ingress.tls[0].hosts[0]=rancher-hub.example.com
```

### Using Specific Image Tags

```bash
helm install rancher-hub ./helm/rancher-hub \
  --set backend.image.tag=1.0.0 \
  --set frontend.image.tag=1.0.0
```

## Accessing the Application

### Port Forward (Development)

```bash
# Access frontend
kubectl port-forward svc/rancher-hub-frontend 8080:80

# Access backend API
kubectl port-forward svc/rancher-hub-backend 3000:3000

# Access PostgreSQL
kubectl port-forward svc/rancher-hub-postgresql 5432:5432
```

### Default Credentials

- **Username:** admin
- **Password:** admin123

**Important:** Change the default password immediately after first login!

## Upgrading

```bash
# Upgrade with new values
helm upgrade rancher-hub ./helm/rancher-hub --values custom-values.yaml

# Upgrade to new version
helm upgrade rancher-hub ./helm/rancher-hub --set backend.image.tag=1.1.0
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/instance=rancher-hub
```

### View Logs

```bash
# Backend logs
kubectl logs -l app.kubernetes.io/component=backend -f

# Frontend logs
kubectl logs -l app.kubernetes.io/component=frontend -f

# PostgreSQL logs
kubectl logs -l app.kubernetes.io/component=database -f
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
kubectl run postgresql-client --rm -it --restart=Never --image=postgres:15-alpine \
  --env PGPASSWORD=YOUR_PASSWORD \
  --command -- psql -h rancher-hub-postgresql -U rancher_hub -d rancher_hub
```

### Check Secrets

```bash
# View secret keys
kubectl get secret rancher-hub-backend -o yaml

# Decode JWT secret
kubectl get secret rancher-hub-backend -o jsonpath='{.data.jwt-secret}' | base64 -d
```

## Security Considerations

1. **Change Default Passwords:** Always use strong, unique passwords in production
2. **Use Secrets:** Store sensitive data in Kubernetes secrets, not in values files
3. **Enable TLS:** Always use HTTPS in production via ingress with TLS
4. **Network Policies:** Implement network policies to restrict traffic
5. **Resource Limits:** Set appropriate resource limits to prevent resource exhaustion
6. **Regular Updates:** Keep the chart and images up to date with security patches

## Support

For issues and feature requests, please visit:
- **GitHub:** https://github.com/thanhtunguet/RancherHub
- **Documentation:** https://github.com/thanhtunguet/RancherHub/tree/main/docs

## License

See the main project repository for license information.
