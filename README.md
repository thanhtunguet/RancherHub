# Rancher Hub - Service Sync Manager

A comprehensive tool for managing and synchronizing services across different environments in Rancher clusters.

## Features

### Core Features

- **Multi-Site Support**: Connect to multiple Rancher instances with API tokens
- **Environment Management**: Organize your applications by environments (Dev, Staging, Production)
- **App Instance Management**: Link environments to specific Rancher clusters and namespaces
- **Service Synchronization**: Sync services between environments with a single click
- **Visual Dashboard**: Clean UI for managing all your Rancher resources
- **Sync History**: Track and review synchronization operations

### Advanced Features

- **User Management**:
  - Secure authentication system with JWT tokens
  - Two-Factor Authentication (2FA) with QR code setup
  - Mandatory 2FA for enhanced security
  - **Trusted Devices**: Option to trust browsers for 30 days to skip 2FA
    - Device fingerprinting for stable device identification
    - Maximum 3 trusted devices per user
    - Full device management UI to view and revoke devices
    - Automatic device revocation on password change
  - User CRUD operations (Create, Read, Update, Delete)
  - Password management and change functionality
  - User activity tracking (last login, active/inactive status)
  - User statistics dashboard

- **ConfigMap Management**:
  - Compare ConfigMaps between different app instances/environments
  - Key-by-key detailed comparison with visual indicators
  - Sync individual keys or multiple keys in batch
  - Status indicators: Identical, Different, Missing in Source, Missing in Target
  - Summary statistics for quick overview
  - Copy values to clipboard for easy reference
  - Support for viewing large configuration values with expand/collapse

- **Harbor Registry Integration**:
  - Connect to Harbor Docker registries
  - Manage container registry credentials
  - View image repositories and tags
  - Integration with service image management

- **Storage View & Image Management**:
  - Display services with container image information
  - View image tags and sizes
  - Track image deployments across environments
  - Storage utilization insights

- **Monitoring & Alerting System**:
  - Automated health checks for app instances
  - Telegram notifications with proxy support
  - Scheduled monitoring (daily at 6:00 AM)
  - Real-time service status monitoring
  - Alert history and resolution tracking
  - Monitoring dashboard with performance metrics

## Screenshot

![screenshot](assets/RancherHub-screenshot.png)

## Feature Highlights

### 🔐 User Management & Authentication

Rancher Hub includes a comprehensive user management system with enterprise-grade security:

- **Secure Login System**: JWT-based authentication with secure password hashing (bcrypt)
- **Two-Factor Authentication (2FA)**: Mandatory TOTP-based 2FA using authenticator apps (Google Authenticator, Authy, etc.)
  - QR code generation for easy setup
  - Backup codes for account recovery
  - Enable/disable 2FA with verification
- **Trusted Devices**: Enhanced user experience with device trust management
  - Option to trust browsers/devices for 30 days to skip repeated 2FA
  - Secure device fingerprinting using FingerprintJS
  - Maximum 3 trusted devices per user (oldest auto-removed when limit exceeded)
  - Full device management interface:
    - View all trusted devices with browser/OS info, last used date, and expiration
    - Revoke individual devices or all devices at once
    - Current device indicator for easy identification
  - Automatic security measures:
    - All trusted devices revoked on password change
    - IP address logging for audit trail
    - 30-day expiration with daily cleanup
- **User Administration**: Complete user lifecycle management
  - Create and manage multiple users
  - Set active/inactive status
  - Track user activity and login history
  - User statistics and monitoring
- **Password Management**: Secure password change functionality for all users
- **Protected Routes**: All application routes are protected and require authentication

### 🔄 ConfigMap Synchronization & Comparison

Powerful ConfigMap management across environments:

- **Visual Comparison**: Side-by-side comparison of ConfigMaps between any two app instances
- **Detailed Diff View**: 
  - Key-by-key comparison with clear status indicators
  - Identify missing, different, or identical keys instantly
  - View full configuration values with syntax highlighting
- **Smart Synchronization**:
  - Sync individual configuration keys with one click
  - Batch sync multiple keys simultaneously
  - Preview changes before applying
- **Summary Dashboard**: Quick overview showing total, identical, different, and missing ConfigMaps
- **Cross-Environment Support**: Compare and sync between Dev, Staging, Production, or any custom environments

### 📊 Service Management

- **Service Discovery**: Automatically fetch and display all services from Rancher clusters
- **Service Filtering**: Filter by environment, app instance, or custom criteria
- **Service Synchronization**: One-click sync of service configurations across environments
- **Comprehensive Audit Trail**:
  - Detailed sync history for both services and ConfigMaps
  - Automatic user attribution (tracks which user initiated each sync)
  - Precise timestamps for all sync operations
  - Rich logging with source/target environment details
  - Error tracking and reporting with user context
- **Image Management**: Track container images and tags across environments
- **Storage Analytics**: View service storage utilization and image sizes

### 🏗️ Harbor Registry Integration

- **Registry Management**: Connect to multiple Harbor Docker registries
- **Credential Management**: Secure storage of registry authentication
- **Image Repository Access**: Browse and manage container images
- **Registry Health Monitoring**: Track registry availability and performance

### 📊 Monitoring & Health Checks

- **Automated Monitoring**: Scheduled health checks for all app instances
- **Telegram Alerting**: Real-time notifications with proxy support for restricted regions
- **Performance Metrics**: Track response times and service availability
- **Alert Management**: Comprehensive alert history and resolution tracking
- **Dashboard Analytics**: Visual monitoring dashboard with trends and insights

### 🏢 Multi-Site & Environment Organization

- **Rancher Sites**: Connect to unlimited Rancher instances
- **Environments**: Organize by Dev, Staging, Production, or custom environments
- **App Instances**: Map environments to specific cluster/namespace combinations
- **Flexible Architecture**: Support for complex multi-cluster, multi-environment setups

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker (for development environment)

### Development Setup

#### Option 1: Local Development (Recommended)

1. Install dependencies:
```bash
npm install
```

2. Copy environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start development servers:
```bash
npm run dev
```

This will start both the backend (NestJS) and frontend (React + Vite) servers concurrently.

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

#### Default Credentials

On first run, a default admin user is automatically created:

- **Username**: `admin`
- **Email**: `admin@rancherhub.local`
- **Password**: `admin123`

> ⚠️ **Security Notice**: You will be required to set up Two-Factor Authentication (2FA) on first login. Please change the default password immediately after logging in!

#### Option 2: Docker Development

1. Start with Docker Compose:
```bash
docker-compose up --build
```

This will start all services including PostgreSQL database.

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

The default admin credentials (admin/admin123) will work for Docker setup as well.

### Project Structure

```
rancher-hub/
├── backend/          # NestJS backend application
├── frontend/         # React frontend application
├── docs/            # Documentation
├── docker-compose.yml # Development environment
└── PROJECT_PLAN.md  # Detailed project plan
```

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Ant Design
- **Backend**: NestJS + TypeScript + TypeORM + SQLite/PostgreSQL
- **State Management**: Zustand + React Query
- **Authentication**: 
  - JWT-based user authentication
  - Two-Factor Authentication (2FA) with TOTP
  - Rancher API tokens for cluster access
- **Security**: 
  - bcrypt password hashing (12 rounds)
  - Protected API routes with JWT guards
  - Mandatory 2FA for all users

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run lint` - Lint both applications

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories based on the `.env.example` files.

## Usage Guide

### Getting Started with User Management

1. **Initial Login**:
   - Navigate to http://localhost:5173
   - Log in with default credentials (admin/admin123)
   - You'll be prompted to set up 2FA immediately

2. **Setting up 2FA**:
   - Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
   - Enter the 6-digit code to verify
   - Save your backup codes in a secure location

3. **Managing Users**:
   - Navigate to "User Management" in the sidebar
   - View user statistics and list of all users
   - Create new users with username, email, and password
   - Edit user information or deactivate users
   - Delete users when necessary

4. **User Settings**:
   - Click on your username in the top-right corner
   - Change password from the dropdown menu
   - Enable/disable 2FA (requires verification)

### Using ConfigMap Diffs

1. **Setup Prerequisites**:
   - Configure at least one Rancher site
   - Create environments (e.g., Dev, Staging, Production)
   - Set up app instances linking environments to clusters/namespaces

2. **Compare ConfigMaps**:
   - Navigate to "ConfigMap Diffs" in the sidebar
   - Select source app instance (e.g., Production)
   - Select target app instance (e.g., Staging)
   - Click "Compare" to view differences

3. **Review Differences**:
   - View summary statistics (total, identical, different, missing)
   - Browse the comparison table with status indicators:
     - 🟢 **Identical**: ConfigMaps are the same
     - 🔵 **Different**: ConfigMaps exist but have different values
     - 🟠 **Missing in Target**: ConfigMap exists in source but not in target
     - 🔴 **Missing in Source**: ConfigMap exists in target but not in source

4. **Sync Configuration**:
   - Click "Details" on any ConfigMap to view key-by-key comparison
   - Review individual key differences
   - Select keys to sync using checkboxes
   - Click "Sync Selected Keys" to synchronize multiple keys
   - Or click "Sync" on individual keys for single-key updates

5. **Best Practices**:
   - Always review changes before syncing
   - Use copy-to-clipboard feature to backup values
   - Compare Production → Staging before promoting changes
   - Check sync history for audit trail

### Managing Services

1. Navigate to "Services" to view all services from configured app instances
2. Filter services by environment or app instance
3. Select services and choose target environment
4. Click "Sync" to synchronize service configurations
5. Review sync history for operation details

### Using Harbor Registry Integration

1. **Setup Harbor Sites**:
   - Navigate to "Harbor Sites" in the sidebar
   - Add Harbor registry URL and credentials
   - Test connection to verify access

2. **Managing Container Images**:
   - View image repositories and tags
   - Track image deployments across environments
   - Monitor registry health and availability

### Monitoring and Alerting

1. **Configure Monitoring**:
   - Navigate to "Monitoring" in the sidebar
   - Set up Telegram bot token and chat ID
   - Configure proxy settings if needed (for restricted regions)
   - Set monitoring intervals and alert thresholds

2. **Health Check Management**:
   - Enable monitoring for app instances
   - Configure daily health check schedule (6:00 AM)
   - Set up alert notifications for service failures
   - Review monitoring history and performance metrics

3. **Alert Management**:
   - Receive real-time Telegram notifications
   - View alert history and resolution status
   - Track service availability trends
   - Monitor performance metrics and response times

## License

MIT.