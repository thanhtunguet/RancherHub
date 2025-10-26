# GitHub Actions Setup

This repository includes comprehensive GitHub Actions workflows for building and deploying Docker images for both the backend (NestJS) and frontend (Vite React) applications using **Yarn** for package management.

## Workflows Overview

### 1. Build and Push (`build-and-push.yml`)
- **Triggers**: Push to `main`/`develop` branches, pull requests, and version tags
- **Purpose**: Builds and pushes Docker images to Docker Hub
- **Features**:
  - Multi-platform builds (linux/amd64, linux/arm64)
  - GitHub Actions cache for faster builds
  - Automatic tagging based on branch, PR, or version
  - Only pushes to Docker Hub on non-PR events
  - Uses Yarn for dependency management

### 2. Test Build (`test-build.yml`)
- **Triggers**: Pull requests to `main`/`develop` branches
- **Purpose**: Tests Docker builds without pushing to registry
- **Features**:
  - Validates Dockerfile syntax and build process
  - Runs basic health checks on built images
  - Ensures images start correctly
  - Uses Yarn for dependency management

### 3. Release (`release.yml`)
- **Triggers**: Push of version tags (e.g., `v1.0.0`)
- **Purpose**: Creates GitHub releases and pushes versioned images
- **Features**:
  - Creates GitHub releases automatically
  - Pushes both versioned and latest tags
  - Generates release notes with Docker image information
  - Uses Yarn for dependency management

## Prerequisites

### 1. Docker Hub Token
You need to create a Docker Hub access token:

1. Go to [Docker Hub](https://hub.docker.com/)
2. Navigate to Account Settings → Security
3. Create a new access token
4. Add the token to your GitHub repository secrets as `DOCKERHUB_TOKEN`

### 2. GitHub Repository Secrets
Add the following secrets to your GitHub repository:

- `DOCKERHUB_TOKEN`: Your Docker Hub access token

### 3. Yarn Lock Files
Ensure you have `yarn.lock` files in both `backend/` and `frontend/` directories for consistent dependency resolution.

## Docker Images

The workflows will create the following Docker images:

### Backend (NestJS)
- **Base Image**: `node:18-alpine`
- **Package Manager**: Yarn
- **Port**: 3000
- **Health Check**: `/health` endpoint
- **Image Name**: `{username}/{repository}-backend`

### Frontend (Vite React)
- **Base Image**: `nginx:alpine`
- **Package Manager**: Yarn (build stage)
- **Port**: 80
- **Web Server**: Nginx
- **Image Name**: `{username}/{repository}-frontend`

## Usage

### Running Images Locally

```bash
# Backend
docker run -p 3000:3000 your-username/rancherhub-backend:latest

# Frontend
docker run -p 80:80 your-username/rancherhub-frontend:latest
```

### Using Specific Versions

```bash
# Backend with specific version
docker run -p 3000:3000 your-username/rancherhub-backend:v1.0.0

# Frontend with specific version
docker run -p 80:80 your-username/rancherhub-frontend:v1.0.0
```

## Image Tags

The workflows automatically create the following tags:

- `latest`: Latest build from main branch
- `{branch-name}`: Build from specific branch
- `{commit-sha}`: Build from specific commit
- `{version}`: Versioned releases (e.g., `v1.0.0`)

## Workflow Triggers

### Automatic Triggers
- **Push to main/develop**: Builds and pushes images
- **Pull Request**: Tests builds without pushing
- **Version Tag**: Creates release and pushes versioned images

### Manual Triggers
You can also trigger workflows manually from the GitHub Actions tab.

## Monitoring

### Workflow Status
- Check the [Actions tab](https://github.com/{username}/{repository}/actions) in your repository
- Monitor build logs for any issues
- Review Docker Hub for pushed images

### Health Checks
Both images include health checks:
- **Backend**: HTTP GET to `/health` endpoint
- **Frontend**: HTTP GET to root path

## Troubleshooting

### Common Issues

1. **Docker Hub Authentication Failed**
   - Verify `DOCKERHUB_TOKEN` secret is set correctly
   - Check token permissions in Docker Hub

2. **Build Failures**
   - Check Dockerfile syntax
   - Verify all required files are present (including `yarn.lock`)
   - Review build logs for specific errors

3. **Push Failures**
   - Ensure you have write permissions to Docker Hub repository
   - Check network connectivity

4. **Yarn-related Issues**
   - Ensure `yarn.lock` files are committed to the repository
   - Check for yarn version compatibility
   - Verify all dependencies are properly listed in `package.json`

### Debugging

1. **Local Testing**
   ```bash
   # Test backend build
   docker build -t test-backend ./backend
   
   # Test frontend build
   docker build -t test-frontend ./frontend
   ```

2. **Check Image Contents**
   ```bash
   # Inspect backend image
   docker run --rm -it test-backend sh
   
   # Inspect frontend image
   docker run --rm -it test-frontend sh
   ```

3. **Test Yarn Installation**
   ```bash
   # Test backend dependencies
   cd backend && yarn install --frozen-lockfile
   
   # Test frontend dependencies
   cd frontend && yarn install --frozen-lockfile
   ```

## Security Features

- **Non-root Users**: Both images run as non-root users
- **Multi-stage Builds**: Separate build and runtime stages
- **Minimal Base Images**: Alpine Linux for smaller attack surface
- **Health Checks**: Built-in health monitoring
- **Frozen Lockfiles**: Uses `--frozen-lockfile` for reproducible builds

## Performance Optimizations

- **GitHub Actions Cache**: Build cache for faster subsequent builds
- **Yarn Cache**: Leverages yarn's caching mechanism
- **Multi-platform Builds**: Support for both AMD64 and ARM64
- **Layer Caching**: Optimized Docker layer caching
- **Parallel Builds**: Backend and frontend build simultaneously

## Customization

### Environment Variables
You can customize the workflows by modifying:
- `REGISTRY`: Docker registry (default: docker.io)
- `BACKEND_IMAGE_NAME`: Backend image name
- `FRONTEND_IMAGE_NAME`: Frontend image name

### Build Arguments
Add build arguments to Dockerfiles for customization:
```dockerfile
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
```

### Yarn Configuration
You can customize yarn behavior by adding `.yarnrc` files or modifying yarn commands in the Dockerfiles.

### Additional Platforms
Modify the `platforms` parameter in workflows to support additional architectures.

## Support

For issues or questions:
1. Check the workflow logs in GitHub Actions
2. Review Docker Hub for image availability
3. Verify all prerequisites are met
4. Check this documentation for common solutions
5. Ensure yarn.lock files are properly committed 