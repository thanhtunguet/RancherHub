---
title: Service Synchronization
description: Learn how to sync services between environments
---

# Service Synchronization

Service synchronization allows you to copy service configurations from one environment to another with a single click.

## Overview

Service synchronization helps you:
- Promote services from Dev → Staging → Production
- Keep environments in sync
- Deploy updates quickly and consistently

## Step 1: View Services

1. Navigate to "Services" from the sidebar
2. You'll see all services from all configured app instances
3. Use filters to narrow down:
   - Filter by Environment
   - Filter by App Instance
   - Filter by Status

## Step 2: Select Services to Sync

1. Check the boxes next to services you want to sync
2. You can select multiple services at once
3. Selected services are highlighted

## Step 3: Choose Target Environment

1. Click "Sync Selected Services"
2. Select the target Environment (e.g., "Production")
3. Select one or more target App Instances
4. Review the summary of what will be synced

## Step 4: Execute Sync

1. Click "Confirm Sync"
2. Wait for the operation to complete
3. Review the sync history for details

## What Gets Synced?

When syncing a service, the following are copied:
- Container image and tag
- Resource limits and requests
- Environment variables
- Service annotations and labels

**Note**: ConfigMaps are NOT automatically synced. Use [ConfigMap Management](/guides/configmap-management) separately.

## Best Practices

1. **Test First**: Always test in Dev/Staging before Production
2. **Review Changes**: Check what will be synced before confirming
3. **Use Sync History**: Review sync history to track changes
4. **Sync ConfigMaps Separately**: Don't forget to sync ConfigMaps if needed

## Troubleshooting

### Service Not Found in Target

- Ensure the service exists in the target namespace
- Check that the target app instance is correctly configured

### Sync Failed

- Verify network connectivity to target cluster
- Check Rancher API token permissions
- Review sync history for error details

## Related Guides

- [ConfigMap Management](/guides/configmap-management)
- [Configuring Environments](/guides/configuring-environments)
- [Troubleshooting](/guides/troubleshooting)
