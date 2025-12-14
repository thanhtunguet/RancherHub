---
layout: page
title: Getting Started
description: Quick start guide for Rancher Hub
---

# Getting Started with Rancher Hub

Rancher Hub is a comprehensive tool for managing and synchronizing services across different environments in Rancher clusters. This guide will help you get up and running quickly.

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Docker** (optional, for containerized development)
- Access to one or more Rancher clusters with API tokens

## Installation

### Option 1: Local Development (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thanhtunguet/RancherHub.git
   cd RancherHub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment files:**
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start both the backend (NestJS) and frontend (React + Vite) servers concurrently.

   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000
   - **API Documentation**: http://localhost:3000/api/docs

### Option 2: Docker Development

1. **Start with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

   This will start all services including PostgreSQL database.

   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000
   - **PostgreSQL**: localhost:5432

## Initial Setup

### Default Credentials

On first run, a default admin user is automatically created:

- **Username**: `admin`
- **Email**: `admin@rancherhub.local`
- **Password**: `admin123`

> ⚠️ **Security Notice**: You will be required to set up Two-Factor Authentication (2FA) on first login. Please change the default password immediately after logging in!

### First Login Steps

1. Navigate to http://localhost:5173
2. Log in with default credentials (admin/admin123)
3. You'll be prompted to set up 2FA immediately
4. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
5. Enter the 6-digit code to verify
6. Save your backup codes in a secure location
7. Change your password from the user settings

## Next Steps

Once you're logged in, you can:

1. **[Configure Rancher Sites](/features#rancher-sites)** - Connect to your Rancher clusters
2. **[Set up Environments](/features#environments)** - Organize your applications by environment
3. **[Create App Instances](/features#app-instances)** - Link environments to specific clusters/namespaces
4. **[Start Managing Services](/features#service-management)** - View and synchronize services across environments

## Need Help?

- Check out the [Features](/features) page for detailed feature documentation
- Review the [API Documentation](/api) for backend API details
- Visit our [GitHub repository](https://github.com/thanhtunguet/RancherHub) for issues and contributions
