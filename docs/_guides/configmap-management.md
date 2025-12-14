---
title: ConfigMap Management
description: Compare and sync ConfigMaps between environments
---

# ConfigMap Management

ConfigMaps store configuration data for your applications. Rancher Hub makes it easy to compare and sync ConfigMaps across environments.

## Overview

ConfigMap management features:
- Side-by-side comparison of ConfigMaps
- Key-by-key diff view
- Selective synchronization
- Batch operations

## Step 1: Compare ConfigMaps

1. Navigate to "ConfigMap Diffs" from the sidebar
2. Select a **Source** app instance (e.g., Staging)
3. Select a **Target** app instance (e.g., Production)
4. Click "Compare"

## Step 2: Review Differences

You'll see a summary with:
- **Total ConfigMaps**: Number of ConfigMaps found
- **Identical**: ConfigMaps that match
- **Different**: ConfigMaps with differences
- **Missing**: ConfigMaps that exist in one but not the other

## Step 3: View Detailed Comparison

1. Click "Details" on any ConfigMap
2. See a key-by-key comparison:
   - **Identical**: Keys with matching values
   - **Different**: Keys with different values
   - **Missing in Target**: Keys only in source
   - **Missing in Source**: Keys only in target

## Step 4: Sync Configuration Keys

### Sync Individual Keys

1. In the detailed view, find the key you want to sync
2. Click "Sync" on that specific key
3. Confirm the sync operation

### Sync Multiple Keys

1. Check the boxes next to keys you want to sync
2. Click "Sync Selected Keys"
3. Review the summary
4. Confirm the sync

### Sync All Keys

1. Click "Sync All" to sync all different keys
2. Confirm the operation

## Best Practices

1. **Review Before Syncing**: Always review differences before syncing
2. **Copy Values**: Use the copy button to backup values before syncing
3. **Test First**: Test ConfigMap changes in non-production first
4. **Document Changes**: Keep track of what was changed and why

## Use Cases

### Promoting Configuration

Promote tested configuration from Staging to Production:
1. Compare Staging → Production
2. Review differences
3. Sync selected keys
4. Verify in Production

### Fixing Configuration Drift

When environments get out of sync:
1. Compare environments
2. Identify differences
3. Sync to restore consistency

## Related Guides

- [Service Synchronization](/guides/service-synchronization)
- [Configuring Environments](/guides/configuring-environments)
- [Troubleshooting](/guides/troubleshooting)
