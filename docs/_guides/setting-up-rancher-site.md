---
title: Setting Up Your First Rancher Site
description: Learn how to connect Rancher Hub to your Rancher cluster
---

# Setting Up Your First Rancher Site

This guide will walk you through connecting Rancher Hub to your first Rancher cluster.

## Prerequisites

Before you begin, make sure you have:

- Access to a Rancher cluster
- A Rancher API token with appropriate permissions
- The Rancher cluster URL

## Step 1: Generate a Rancher API Token

1. Log in to your Rancher UI
2. Navigate to your user profile (top right corner)
3. Click on "API & Keys"
4. Click "Create API Key"
5. Give it a name (e.g., "Rancher Hub")
6. Set an expiration date (optional)
7. Click "Create"
8. **Important**: Copy the Bearer Token immediately - you won't be able to see it again!

## Step 2: Add the Site in Rancher Hub

1. Log in to Rancher Hub
2. Navigate to "Rancher Sites" from the sidebar
3. Click "Add Rancher Site"
4. Fill in the form:
   - **Name**: A descriptive name (e.g., "Production Cluster")
   - **URL**: Your Rancher cluster URL (e.g., `https://rancher.example.com`)
   - **Token**: Paste the Bearer Token you copied earlier
5. Click "Save"

## Step 3: Test the Connection

1. After saving, click "Test Connection" on the site card
2. Wait for the connection test to complete
3. You should see a "Connected" status if everything is working

## Step 4: Verify Access

1. Once connected, you should be able to:
   - View clusters from this Rancher site
   - Browse namespaces
   - See services and ConfigMaps

## Troubleshooting

### Connection Failed

- **Check the URL**: Make sure it's the correct Rancher URL (usually ends with `/v3`)
- **Verify Token**: Ensure the token hasn't expired and has the correct permissions
- **Network Access**: Confirm that Rancher Hub can reach your Rancher cluster

### Token Permissions

Your API token needs the following permissions:
- Read access to clusters
- Read access to namespaces
- Read access to workloads/services
- Read/write access to ConfigMaps (if you want to sync)

## Next Steps

Now that you've connected your first Rancher site, you can:

- [Configure Environments](/guides/configuring-environments) - Set up Dev, Staging, Production
- [Create App Instances](/getting-started#app-instance-configuration) - Link environments to clusters
- [Start Managing Services](/features#service-management) - View and sync services

## Related Guides

- [Configuring Environments](/guides/configuring-environments)
- [Service Synchronization](/guides/service-synchronization)
- [Troubleshooting](/guides/troubleshooting)
