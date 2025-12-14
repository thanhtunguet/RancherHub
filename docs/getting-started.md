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

### Option 2: Docker Compose (Production Images)

Run Rancher Hub using pre-built Docker images with Docker Compose.

1. **Create a `docker-compose.yml` file:**
   ```yaml
   services:
     # PostgreSQL Database
     postgres:
       image: postgres:15-alpine
       container_name: rancher-hub-postgres
       restart: unless-stopped
       environment:
         POSTGRES_DB: rancher_hub
         POSTGRES_USER: rancher_hub
         POSTGRES_PASSWORD: rancher_hub_password
       volumes:
         - postgres_data:/var/lib/postgresql/data
       ports:
         - "5432:5432"
       networks:
         - rancher-hub-network

     # Backend API Service
     backend:
       image: thanhtunguet/rancher-hub-backend:latest
       container_name: rancher-hub-backend
       restart: unless-stopped
       environment:
         NODE_ENV: production
         PORT: 3000
         DATABASE_TYPE: postgres
         DATABASE_HOST: postgres
         DATABASE_PORT: 5432
         DATABASE_NAME: rancher_hub
         DATABASE_USERNAME: rancher_hub
         DATABASE_PASSWORD: rancher_hub_password
         FRONTEND_URL: http://localhost:8080
         ENCRYPTION_KEY: your-256-bit-secret-key-change-this
         JWT_SECRET: your-super-secret-jwt-key-change-in-production
       depends_on:
         - postgres
       networks:
         - rancher-hub-network

     # Frontend Service
     frontend:
       image: thanhtunguet/rancher-hub-frontend:latest
       container_name: rancher-hub-frontend
       restart: unless-stopped
       networks:
         - rancher-hub-network

     # Nginx Reverse Proxy
     nginx:
       image: nginx:stable-alpine
       container_name: rancher-hub-nginx
       restart: unless-stopped
       ports:
         - "8080:80"
       volumes:
         - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
       depends_on:
         - backend
         - frontend
       networks:
         - rancher-hub-network

   volumes:
     postgres_data:

   networks:
     rancher-hub-network:
       driver: bridge
   ```

2. **Create Nginx configuration** (`nginx/conf.d/default.conf`):
   ```nginx
   upstream backend {
       server backend:3000;
   }

   upstream frontend {
       server frontend:80;
   }

   server {
       listen 80;
       server_name localhost;

       # Frontend
       location / {
           proxy_pass http://frontend;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Backend API
       location /api {
           proxy_pass http://backend;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - **PostgreSQL Database** on port 5432
   - **Backend API** (internal, accessible via Nginx)
   - **Frontend** (internal, accessible via Nginx)
   - **Nginx Reverse Proxy** on port 8080

4. **Access the application:**
   - **Frontend**: http://localhost:8080
   - **Backend API**: http://localhost:8080/api
   - **API Documentation**: http://localhost:8080/api/docs
   - **PostgreSQL**: localhost:5432

5. **View logs:**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

6. **Stop services:**
   ```bash
   docker-compose down
   ```

   To also remove volumes (⚠️ deletes database data):
   ```bash
   docker-compose down -v
   ```

#### Environment Variables

The backend service requires the following environment variables:

- **`DATABASE_TYPE`**: Database type (`sqlite` or `postgres`)
- **`DATABASE_HOST`**: Database hostname (use `postgres` for Docker Compose)
- **`DATABASE_PORT`**: Database port (default: `5432`)
- **`DATABASE_NAME`**: Database name (default: `rancher_hub`)
- **`DATABASE_USERNAME`**: Database username
- **`DATABASE_PASSWORD`**: Database password
- **`FRONTEND_URL`**: Frontend URL for CORS (default: `http://localhost:8080`)
- **`ENCRYPTION_KEY`**: 256-bit key for encrypting sensitive data (⚠️ **Change this in production!**)
- **`JWT_SECRET`**: Secret key for JWT tokens (⚠️ **Change this in production!**)

> ⚠️ **Security Notice**: Always change `ENCRYPTION_KEY` and `JWT_SECRET` in production environments. Generate secure random keys for these values.

## Initial Setup

### Default Credentials

On first run, a default admin user is automatically created:

- **Username**: `admin`
- **Email**: `admin@rancherhub.local`
- **Password**: `admin123`

> ⚠️ **Security Notice**: You will be required to set up Two-Factor Authentication (2FA) on first login. Please change the default password immediately after logging in!

### First Login Steps

1. Navigate to the application:
   - **Local Development**: http://localhost:5173
   - **Docker Compose**: http://localhost:8080
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
