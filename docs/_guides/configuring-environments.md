---
title: Configuring Environments
description: Learn how to organize your applications by environment
---

# Configuring Environments

Environments help you organize your applications and manage deployments across different stages (Dev, Staging, Production).

## What are Environments?

Environments are logical groupings that represent different stages of your deployment pipeline:

- **Development (Dev)**: Where developers test new features
- **Staging**: Pre-production environment for final testing
- **Production**: Live environment serving end users

You can create custom environments as needed (e.g., QA, UAT, Demo).

## Step 1: Create an Environment

1. Navigate to "Environments" from the sidebar
2. Click "Add Environment"
3. Enter a name (e.g., "Production", "Staging", "Development")
4. Optionally add a description
5. Click "Save"

## Step 2: Create App Instances

App instances link environments to specific Rancher clusters and namespaces:

1. Navigate to "App Instances" from the sidebar
2. Click "Add App Instance"
3. Select an Environment (e.g., "Production")
4. Select a Rancher Site
5. Select a Cluster (loaded dynamically from the site)
6. Select a Namespace (loaded dynamically from the cluster)
7. Click "Save"

## Example Setup

Here's a typical setup for a multi-environment deployment:

### Production Environment
- **App Instance 1**: Production → Rancher Site 1 → Cluster: prod-cluster → Namespace: api
- **App Instance 2**: Production → Rancher Site 1 → Cluster: prod-cluster → Namespace: frontend

### Staging Environment
- **App Instance 1**: Staging → Rancher Site 1 → Cluster: staging-cluster → Namespace: api
- **App Instance 2**: Staging → Rancher Site 1 → Cluster: staging-cluster → Namespace: frontend

### Development Environment
- **App Instance 1**: Development → Rancher Site 2 → Cluster: dev-cluster → Namespace: api
- **App Instance 2**: Development → Rancher Site 2 → Cluster: dev-cluster → Namespace: frontend

## Best Practices

1. **Consistent Naming**: Use consistent naming across environments
2. **Namespace Strategy**: Use the same namespace names across environments when possible
3. **Documentation**: Add descriptions to environments explaining their purpose
4. **Access Control**: Consider who has access to which environments

## Next Steps

Once you've configured environments, you can:

- [Sync Services](/guides/service-synchronization) between environments
- [Compare ConfigMaps](/features#configmap-management) across environments
- [Set up Monitoring](/guides/monitoring-alerting) for your environments

## Related Guides

- [Setting Up Your First Rancher Site](/guides/setting-up-rancher-site)
- [Service Synchronization](/guides/service-synchronization)
- [ConfigMap Management](/guides/configmap-management)
