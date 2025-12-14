---
layout: page
title: Features
description: Comprehensive overview of Rancher Hub features
---

# Features

Rancher Hub provides a comprehensive set of features for managing and synchronizing services across multiple Rancher clusters. Here's what you can do:

## 🔐 Authentication & User Management

### Secure Authentication
- **JWT-based Authentication** - Secure token-based authentication system
- **Two-Factor Authentication (2FA)** - Mandatory TOTP with QR code setup
- **Trusted Devices** - Option to trust browsers for 30 days to skip 2FA verification
  - Device fingerprinting for stable device identification
  - Maximum 3 trusted devices per user
  - Full device management UI
  - Automatic revocation on password change

### User Administration
- Complete user lifecycle management (Create, Read, Update, Delete)
- User activity tracking and statistics
- Password management and recovery
- Protected routes requiring authentication

## 🌐 Multi-Site Integration

### Rancher Sites Management
- Connect to unlimited Rancher instances
- Encrypted storage of API tokens
- Connection testing and validation
- Multi-instance support for managing services across clusters

### Harbor Registry Integration
- Connect to Harbor Docker registries
- Manage container registry credentials
- Browse image repositories and tags
- Track image deployments across environments
- Storage utilization insights

## 🏗️ Environment & Instance Management

### Environment Organization
- Organize applications by environment (Dev, Staging, Production)
- Flexible environment naming and organization
- Environment-based filtering and management

### App Instance Mapping
- Link environments to specific clusters/namespaces
- Dynamic cluster and namespace selection
- Support for complex multi-cluster setups
- Cascading dropdowns for easy selection

## ⚙️ Service Management

### Service Discovery
- Automatic service detection from Rancher clusters
- Real-time service status and replica information
- Advanced filtering by environment, status, and custom criteria

### Service Synchronization
- Complete sync workflow between environments
- Batch operations for multiple services
- One-click service synchronization
- Comprehensive audit trail with user attribution

## 🔄 ConfigMap Management

### Visual Comparison
- Side-by-side comparison of ConfigMaps between environments
- Key-by-key detailed analysis with status indicators
- Clear visual indicators for differences (Identical, Different, Missing)

### Selective Synchronization
- Sync individual configuration keys with one click
- Batch sync multiple keys simultaneously
- Preview changes before applying
- Copy values to clipboard for easy reference

## 📊 Monitoring & Alerting

### Health Check System
- Automated monitoring of app instances
- Scheduled health checks (configurable times)
- Real-time service status monitoring
- Performance metrics and response time tracking

### Telegram Integration
- Real-time notifications via Telegram
- SOCKS5 proxy support for restricted regions
- Alert history and resolution tracking
- Monitoring dashboard with trends and insights

## 💾 Storage & Analytics

### Storage View
- Container image size and storage analytics
- Image tag tracking across environments
- Storage utilization insights
- Repository management integration

## 📈 Audit & History

### Complete Audit Trail
- Detailed sync history for both services and ConfigMaps
- Automatic user attribution (tracks which user initiated each sync)
- Precise timestamps for all sync operations
- Rich logging with source/target environment details
- Error tracking and reporting with user context

### Historical Analytics
- Trends and patterns in sync operations
- User activity tracking
- Performance metrics over time

## 🚀 Advanced Features

### Multi-Cluster Support
- Manage services across multiple Rancher clusters
- Unified interface for all environments
- Cross-cluster synchronization

### API Integration
- Complete REST API with Swagger documentation
- Programmatic access to all features
- Webhook support for automation

### Security Features
- Encrypted storage for sensitive credentials
- JWT tokens with expiration
- Bcrypt password hashing (12 rounds)
- Mandatory 2FA for all users
- Protected API routes with JWT guards

## Getting Started

Ready to explore these features? Check out our [Getting Started Guide](/getting-started) to begin using Rancher Hub.
