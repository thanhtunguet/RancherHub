# Yarn Setup for Rancher Hub

This document explains how to set up Yarn for the Rancher Hub project and resolve Docker build issues.

## Problem

The GitHub Actions were failing with the error:
```
ERROR: failed to solve: failed to compute cache key: "/yarn.lock": not found
```

This happened because:
1. The project was converted from npm to Yarn
2. The Dockerfiles expected `yarn.lock` files
3. The repository didn't have committed `yarn.lock` files

## Solution

### 1. Generate Yarn Lock Files

You need to create `yarn.lock` files for both backend and frontend:

#### Quick Setup (Recommended)
```bash
./generate-yarn-locks.sh
```

This script will:
- Check if Yarn is installed
- Generate `backend/yarn.lock` if it doesn't exist
- Generate `frontend/yarn.lock` if it doesn't exist
- Provide instructions for committing the files

#### Manual Setup
```bash
# Generate backend yarn.lock
cd backend
yarn install
cd ..

# Generate frontend yarn.lock
cd frontend
yarn install
cd ..
```

### 2. Commit the Files

```bash
git add backend/yarn.lock frontend/yarn.lock
git commit -m "Add yarn.lock files for deterministic builds"
git push origin main
```

### 3. GitHub Actions Workflow

There's also a GitHub Actions workflow that can generate the files:

1. Go to your GitHub repository
2. Click **Actions**
3. Find **Generate Yarn Lock Files** workflow
4. Click **Run workflow**
5. Set "Commit the generated yarn.lock files" to `true`
6. Click **Run workflow**

## Why Yarn Lock Files Are Important

### Deterministic Builds
- `yarn.lock` ensures exact same dependency versions across all environments
- Prevents "works on my machine" issues
- Critical for Docker builds and CI/CD

### Security
- Locks dependency versions to prevent supply chain attacks
- Ensures integrity of installed packages
- Provides reproducible builds

### Performance
- Faster installs with `yarn install --frozen-lockfile`
- Better caching in CI environments
- Parallel dependency resolution

## Docker Configuration

The Dockerfiles are now configured to:

```dockerfile
# Copy package files and yarn.lock
COPY package*.json yarn.lock ./

# Install dependencies with frozen lockfile
RUN yarn install --frozen-lockfile
```

### Key Features:
- **Frozen Lockfile**: Uses exact versions from `yarn.lock`
- **Multi-stage Builds**: Optimized for production
- **Caching**: Better Docker layer caching
- **Security**: Non-root user execution

## GitHub Actions Integration

The workflows now:

1. **Check for yarn.lock files**
2. **Generate them if missing** (fallback)
3. **Use Yarn caching** for faster builds
4. **Build Docker images** with locked dependencies

### Workflow Files:
- `build-and-push.yml` - Main CI/CD pipeline
- `release.yml` - Release builds
- `generate-yarn-locks.yml` - Manual yarn.lock generation

## Troubleshooting

### Error: "yarn.lock not found"
**Solution**: Run `./generate-yarn-locks.sh` and commit the files

### Error: "yarn install failed"
**Solution**: Check package.json syntax and dependency conflicts

### Error: "Docker build context"
**Solution**: Ensure yarn.lock files are in the same directory as Dockerfiles

### Performance Issues
**Solution**: Use `yarn install --frozen-lockfile` for faster installs

## Best Practices

### 1. Always Commit yarn.lock
```bash
# DO commit these files
git add yarn.lock
git commit -m "Update dependencies"
```

### 2. Use Frozen Lockfile in CI
```bash
# In CI/CD environments
yarn install --frozen-lockfile
```

### 3. Regular Updates
```bash
# Update dependencies periodically
yarn upgrade
git add yarn.lock
git commit -m "Update dependencies"
```

### 4. Security Audits
```bash
# Check for vulnerabilities
yarn audit
yarn audit --fix
```

## Development vs Production

### Development
```bash
# Install all dependencies including devDependencies
yarn install
```

### Production
```bash
# Install only production dependencies
yarn install --frozen-lockfile --production
```

## Migration from npm

If migrating from npm:

1. **Remove** `package-lock.json`
2. **Generate** `yarn.lock` with `yarn install`
3. **Update** scripts to use `yarn` instead of `npm`
4. **Update** Dockerfiles to use Yarn commands
5. **Commit** yarn.lock files

## Verification

After setup, verify everything works:

```bash
# Test local Docker build
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend

# Test GitHub Actions
git push origin main
# Check Actions tab for successful builds
```

## Support

If you encounter issues:

1. **Check** that yarn.lock files exist and are committed
2. **Verify** Yarn is installed locally
3. **Review** GitHub Actions logs
4. **Test** Docker builds locally first
5. **Check** this documentation for common solutions