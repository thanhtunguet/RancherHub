# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions for automated Docker image building and publishing to Docker Hub.

## Prerequisites

1. **Docker Hub Account**: You need a Docker Hub account (username: `thanhtunguet`)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Docker Hub Access Token**: Required for GitHub Actions to push images
4. **Yarn Package Manager**: Project uses Yarn for dependency management

## Step 1: Create Docker Hub Access Token

1. Go to [Docker Hub](https://hub.docker.com/)
2. Sign in to your account
3. Go to **Account Settings** → **Security**
4. Click **New Access Token**
5. Enter a description: `GitHub Actions - Rancher Hub`
6. Select permissions: **Read, Write, Delete**
7. Click **Generate**
8. **Copy the token** - you won't see it again!

## Step 2: Add GitHub Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:

   - **Name**: `DOCKERHUB_TOKEN`
   - **Value**: Paste the Docker Hub access token you copied

## Step 3: Repository Setup

Your repository should have this structure:
```
RancherHub/
├── .github/
│   └── workflows/
│       ├── build-and-push.yml
│       └── release.yml
├── backend/
│   ├── Dockerfile
│   └── README.md
├── frontend/
│   ├── Dockerfile
│   └── README.md
└── docker-compose.prod.yml
```

## Workflow Triggers

### Build and Push Workflow (`build-and-push.yml`)

**Triggers:**
- Push to `main` branch → builds and pushes `latest` tag
- Push to `develop` branch → builds and pushes `develop` tag
- Pull requests → builds only (no push)
- Git tags → builds and pushes version tags

**Images Created:**
- `thanhtunguet/rancher-hub-backend:latest`
- `thanhtunguet/rancher-hub-frontend:latest`

### Release Workflow (`release.yml`)

**Triggers:**
- GitHub release published → builds and pushes `stable` and version tags

**Images Created:**
- `thanhtunguet/rancher-hub-backend:v1.0.0`
- `thanhtunguet/rancher-hub-backend:stable`
- `thanhtunguet/rancher-hub-frontend:v1.0.0`
- `thanhtunguet/rancher-hub-frontend:stable`

## Usage Examples

### 1. Development Push
```bash
git add .
git commit -m "Add new feature"
git push origin main
```
→ Builds and pushes `:latest` tags

### 2. Create Release
1. Go to GitHub repository
2. Click **Releases** → **Create a new release**
3. Tag: `v1.0.0`
4. Title: `Release v1.0.0`
5. Description: Release notes
6. Click **Publish release**
→ Builds and pushes `:v1.0.0` and `:stable` tags

### 3. Pull Request
```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```
Create PR → Builds images for testing (no push)

## Docker Image Tags

| Event | Backend Tags | Frontend Tags |
|-------|-------------|---------------|
| Push to `main` | `latest` | `latest` |
| Push to `develop` | `develop` | `develop` |
| Release `v1.0.0` | `v1.0.0`, `stable` | `v1.0.0`, `stable` |
| Pull Request | (build only) | (build only) |

## Platform Support

Images are built for multiple architectures:
- `linux/amd64` (Intel/AMD x64)
- `linux/arm64` (ARM64/Apple Silicon)

## Features

### Multi-stage Builds
- Optimized for production with Yarn
- Smaller final image sizes
- Security-focused (non-root users)
- Yarn lockfile-based dependency management

### Caching
- GitHub Actions cache for faster builds
- Layer caching between builds
- Yarn dependency caching
- Automatic yarn.lock generation if missing

### Security
- Vulnerability scanning with Trivy
- Security reports in GitHub Security tab
- Minimal base images (Alpine Linux)

### Docker Hub Integration
- Automatic README updates
- Image descriptions
- Build metadata

## Deployment

### Using Pre-built Images

```bash
# Pull and run latest images
docker-compose -f docker-compose.prod.yml up -d

# Pull and run specific version
docker run -d thanhtunguet/rancher-hub-backend:v1.0.0
docker run -d thanhtunguet/rancher-hub-frontend:v1.0.0
```

### Using Stable Release

```bash
# Use stable tags for production
docker run -d thanhtunguet/rancher-hub-backend:stable
docker run -d thanhtunguet/rancher-hub-frontend:stable
```

## Monitoring Builds

### GitHub Actions
1. Go to your repository
2. Click **Actions** tab
3. View workflow runs and logs

### Docker Hub
1. Go to [Docker Hub](https://hub.docker.com/)
2. View your repositories:
   - `thanhtunguet/rancher-hub-backend`
   - `thanhtunguet/rancher-hub-frontend`
3. Check tags and build information

## Troubleshooting

### Build Failures

1. **Check GitHub Actions logs**:
   - Go to Actions tab
   - Click on failed workflow
   - Review error messages

2. **Common issues**:
   - Missing `DOCKERHUB_TOKEN` secret
   - Invalid Docker Hub credentials
   - Dockerfile syntax errors
   - Build context issues

### Docker Hub Issues

1. **Push denied**: Check access token permissions
2. **Repository not found**: Ensure repositories exist on Docker Hub
3. **Rate limiting**: Docker Hub has pull/push limits

### Fix Examples

```bash
# Test build locally
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend

# Check secrets
# Go to GitHub Settings → Secrets → Actions
# Verify DOCKERHUB_TOKEN exists and is valid

# Verify Docker Hub repos exist
# Create repositories manually if needed:
# - thanhtunguet/rancher-hub-backend
# - thanhtunguet/rancher-hub-frontend
```

## Advanced Configuration

### Custom Build Args

Add build arguments to workflows:

```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    build-args: |
      NODE_VERSION=18
      ALPINE_VERSION=3.18
```

### Multi-environment Support

Create separate workflows for different environments:

```yaml
# .github/workflows/staging.yml
on:
  push:
    branches: [staging]
env:
  BACKEND_IMAGE_NAME: thanhtunguet/rancher-hub-backend-staging
```

### Custom Registry

Switch to different registries:

```yaml
env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE_NAME: ghcr.io/thanhtunguet/rancher-hub-backend
```

## Security Best Practices

1. **Use access tokens**, not passwords
2. **Limit token permissions** to necessary scopes
3. **Rotate tokens regularly**
4. **Monitor security alerts** in GitHub
5. **Keep dependencies updated**
6. **Review vulnerability scans**

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. Review Docker Hub repository settings
3. Verify secret configuration
4. Test builds locally first
5. Check Docker Hub status page