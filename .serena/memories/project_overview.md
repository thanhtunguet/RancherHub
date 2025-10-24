# Rancher Hub - Project Overview

## Purpose
**Rancher Hub** is a Service Sync Manager designed for managing and synchronizing services across different environments in Rancher clusters. It provides a comprehensive tool for DevOps teams to:

- Connect to multiple Rancher instances with API tokens
- Organize applications by environments (Dev, Staging, Production)
- Synchronize services between environments with visual dashboard
- Track synchronization operations with detailed history
- Manage workloads across different Rancher clusters and namespaces

## Current Status
- **Phase**: MVP (Phase 1) ✅ COMPLETED
- **Version**: 1.0.0
- All core features implemented and functional
- Ready for Phase 2 enhancements (advanced filtering, batch operations, rollback capabilities)

## Key Features Implemented
1. **Sites Management** - Multiple Rancher instance connections
2. **Environment Management** - Dev/Staging/Production organization
3. **App Instance Management** - Environment to cluster/namespace linking
4. **Service Management** - Workload viewing with filtering
5. **Service Synchronization** - Complete sync workflow with history tracking

## Architecture
- **Monorepo structure** with separate frontend and backend applications
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Ant Design + Zustand + React Query
- **Backend**: NestJS + TypeScript + TypeORM + SQLite (dev) / PostgreSQL (prod) + Swagger
- **Database**: SQLite for development, PostgreSQL ready for production
- **Real-time updates** with React Query caching
- **API Documentation** with Swagger/OpenAPI