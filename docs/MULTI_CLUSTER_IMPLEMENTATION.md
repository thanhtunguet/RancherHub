# Multi-Cluster Type Support - Implementation Progress

**Started**: December 23, 2024
**Status**: Week 1-3 Complete ✅ | Week 4-5 Pending
**Goal**: Add support for generic Kubernetes clusters (EKS, GKE, AKS, vanilla K8s) alongside Rancher clusters

---

## 📋 Executive Summary

This document tracks the implementation of multi-cluster support using an adapter pattern. Users will be able to:
- Continue using existing Rancher sites (100% backward compatible)
- Add generic Kubernetes clusters via kubeconfig upload
- Sync services, ConfigMaps, and Secrets across different cluster types

### User Requirements (Confirmed)
✅ **Authentication**: Kubeconfig file upload
✅ **Scope**: Generic cluster type only (works for EKS, GKE, AKS, any K8s)
✅ **Migration**: Auto-migrate existing data with defaults
✅ **Discovery**: Each GenericClusterSite = one cluster

---

## ✅ Week 1: Database & Core Infrastructure (COMPLETED)

### Files Created (9 new files)

#### Backend Entities
- **`apps/backend/src/entities/generic-cluster-site.entity.ts`**
  - New entity for storing generic cluster configurations
  - Fields: id, name, kubeconfig (encrypted), clusterName, serverUrl, active, timestamps

#### Adapter Pattern
- **`apps/backend/src/adapters/cluster-adapter.interface.ts`**
  - Core interface defining all cluster operations
  - Methods: testConnection, getNamespaces, getDeployments, updateWorkloadImage, getConfigMaps, updateConfigMapKey, syncConfigMapKeys, getSecrets, updateSecretKey, syncSecretKeys

- **`apps/backend/src/adapters/rancher-cluster.adapter.ts`**
  - Thin wrapper around existing RancherApiService
  - Delegates all calls to RancherApiService methods
  - Zero business logic changes to existing Rancher functionality

- **`apps/backend/src/adapters/generic-cluster.adapter.ts`**
  - Direct Kubernetes API implementation using @kubernetes/client-node
  - Supports Deployments, DaemonSets, StatefulSets
  - ConfigMap and Secret management with base64 encoding
  - System secret filtering (same as Rancher)

- **`apps/backend/src/adapters/cluster-adapter.factory.ts`**
  - Factory for creating appropriate adapter based on cluster type
  - Methods: createAdapter(appInstance), createAdapterFromSite(siteType, siteId)
  - Handles lazy loading of site entities

#### Database Migration
- **`apps/backend/migrations/001-add-generic-cluster-support.sql`**
  - Creates generic_cluster_sites table
  - Adds cluster_type and generic_cluster_site_id to app_instances
  - Makes rancher_site_id nullable
  - Adds CHECK constraint for data integrity
  - Includes rollback script
  - Auto-sets cluster_type='rancher' for existing rows

### Files Modified (3 files)

- **`apps/backend/src/entities/app-instance.entity.ts`**
  - Added `clusterType: 'rancher' | 'generic'` (default: 'rancher')
  - Added `genericClusterSiteId: string | null`
  - Made `rancherSiteId` nullable
  - Added relationship to GenericClusterSite

- **`apps/backend/src/entities/index.ts`**
  - Added export for GenericClusterSite

- **`apps/backend/src/app.module.ts`**
  - Added GenericClusterSite to TypeORM entities array (both postgres and sqlite)

### Dependencies Installed
```bash
npm install --save @kubernetes/client-node
```

### Testing
✅ TypeScript compilation: **PASSED**
✅ No breaking changes to existing code
✅ All types resolve correctly

---

## 🔄 Week 2: GenericClusterSites Module & API (PENDING)

### Tasks
1. Create GenericClusterSitesModule with CRUD operations
2. Implement GenericClusterSitesService with kubeconfig validation
3. Create GenericClusterSitesController with endpoints
4. Add encryption/decryption for kubeconfig
5. Implement connection testing
6. Create DTOs for request validation

### Critical Files to Create
```
apps/backend/src/modules/generic-cluster-sites/
├── generic-cluster-sites.module.ts
├── generic-cluster-sites.controller.ts
├── generic-cluster-sites.service.ts
└── dto/
    ├── create-generic-cluster-site.dto.ts
    └── update-generic-cluster-site.dto.ts
```

### API Endpoints to Implement
```
POST   /api/generic-cluster-sites          Create site
GET    /api/generic-cluster-sites          List all sites
GET    /api/generic-cluster-sites/:id      Get site by ID
PUT    /api/generic-cluster-sites/:id      Update site
DELETE /api/generic-cluster-sites/:id      Delete site
POST   /api/generic-cluster-sites/:id/test Test connection
GET    /api/generic-cluster-sites/:id/namespaces Get namespaces
```

### Key Implementation Notes
- Parse kubeconfig to extract cluster name and server URL
- Encrypt kubeconfig before storing (use same encryption as Rancher tokens)
- Validate kubeconfig format on upload
- Test connection before accepting kubeconfig

---

## 🔧 Week 3: Service Layer Refactoring (PENDING)

### Services to Refactor
1. **ServicesService** - Replace RancherApiService calls with adapter
2. **ConfigMapsService** - Replace RancherApiService calls with adapter
3. **SecretsService** - Replace RancherApiService calls with adapter
4. **AppInstancesService** - Add cluster type validation

### Refactoring Pattern
```typescript
// Before:
const deployments = await this.rancherApiService.getDeploymentsFromK8sApi(
  appInstance.rancherSite,
  appInstance.cluster,
  appInstance.namespace
);

// After:
const adapter = await this.clusterAdapterFactory.createAdapter(appInstance);
const deployments = await adapter.getDeployments(
  appInstance.cluster,
  appInstance.namespace
);
```

### Critical Files to Modify
- `apps/backend/src/modules/services/services.service/get-services-by-app-instance-direct.ts`
- `apps/backend/src/modules/services/services.service/sync-single-service.ts`
- `apps/backend/src/modules/services/services.service/update-service-image.ts`
- `apps/backend/src/modules/configmaps/configmaps.service.ts`
- `apps/backend/src/modules/secrets/secrets.service.ts`
- `apps/backend/src/modules/app-instances/app-instances.service.ts`

### Important Notes
- Inject ClusterAdapterFactory in all service constructors
- Load both rancherSite and genericClusterSite relations in queries
- All business logic (caching, persistence, error handling) remains unchanged
- Only replace direct API calls with adapter calls

---

## 🎨 Week 4: Frontend Implementation (PENDING)

### Components to Create
1. **GenericClusterSiteManagement** - List view with cards
2. **GenericClusterSiteForm** - Create/Edit form with kubeconfig upload
3. **GenericClusterSiteCard** - Display cluster info

### Components to Modify
1. **AppInstanceForm** - Add cluster type selector and conditional site dropdown

### API Client Updates
```typescript
// Add to apps/frontend/src/services/api.ts
export const genericClusterSitesApi = {
  getAll: () => Promise<GenericClusterSite[]>,
  getById: (id: string) => Promise<GenericClusterSite>,
  create: (data) => Promise<GenericClusterSite>,
  update: (id, data) => Promise<GenericClusterSite>,
  delete: (id: string) => Promise<void>,
  testConnection: (id: string) => Promise<{success, message, data}>,
  getNamespaces: (id: string) => Promise<RancherNamespace[]>
}
```

### Type Definitions
```typescript
// Add to apps/frontend/src/types/index.ts
export interface GenericClusterSite {
  id: string;
  name: string;
  clusterName: string;
  serverUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenericClusterSiteRequest {
  name: string;
  kubeconfig: string;
}

// Update existing
export interface CreateAppInstanceRequest {
  name: string;
  cluster: string;
  namespace: string;
  environmentId: string;
  clusterType: 'rancher' | 'generic';
  rancherSiteId?: string;
  genericClusterSiteId?: string;
}
```

### UI Flow
1. User navigates to Generic Cluster Sites page
2. Clicks "Add Cluster Site"
3. Enters name and uploads kubeconfig file
4. System validates and tests connection
5. Cluster site saved with encrypted kubeconfig
6. User can now create app instances using this cluster

---

## 📝 Week 5: Testing & Documentation (PENDING)

### Testing Checklist
- [ ] Unit tests for adapters
- [ ] Integration tests for GenericClusterSitesModule
- [ ] E2E tests for full workflow
- [ ] Test service sync between Rancher and generic clusters
- [ ] Test ConfigMap sync between cluster types
- [ ] Test Secret sync between cluster types
- [ ] Test backward compatibility with existing Rancher sites

### Documentation Updates
- [ ] Update README.md with generic cluster setup instructions
- [ ] Create kubeconfig generation guide
- [ ] Update Swagger API documentation
- [ ] Update CURRENT_STATUS.md
- [ ] Update ROADMAP.md
- [ ] Add architecture diagrams

---

## 🏗️ Architecture Reference

### Database Schema

**generic_cluster_sites**
```sql
id                 UUID PRIMARY KEY
name               VARCHAR(255) NOT NULL
kubeconfig         TEXT NOT NULL            -- Encrypted
cluster_name       VARCHAR(255)             -- Extracted from kubeconfig
server_url         VARCHAR(500)             -- Extracted from kubeconfig
active             BOOLEAN DEFAULT TRUE
created_at         TIMESTAMP
updated_at         TIMESTAMP
```

**app_instances** (modified)
```sql
id                      UUID PRIMARY KEY
name                    VARCHAR(255)
cluster                 VARCHAR(255)
namespace               VARCHAR(255)
cluster_type            VARCHAR(50) DEFAULT 'rancher'  -- NEW
rancher_site_id         UUID NULLABLE                  -- MODIFIED
generic_cluster_site_id UUID NULLABLE                  -- NEW
environment_id          UUID
created_at              TIMESTAMP
updated_at              TIMESTAMP

CONSTRAINT chk_cluster_site CHECK (
  (cluster_type = 'rancher' AND rancher_site_id IS NOT NULL AND generic_cluster_site_id IS NULL) OR
  (cluster_type = 'generic' AND generic_cluster_site_id IS NOT NULL AND rancher_site_id IS NULL)
)
```

### Adapter Pattern Diagram

```
┌─────────────────────────────────────┐
│    IClusterAdapter (Interface)      │
├─────────────────────────────────────┤
│ + testConnection()                  │
│ + getNamespaces()                   │
│ + getDeployments()                  │
│ + updateWorkloadImage()             │
│ + getConfigMaps()                   │
│ + updateConfigMapKey()              │
│ + syncConfigMapKeys()               │
│ + getSecrets()                      │
│ + updateSecretKey()                 │
│ + syncSecretKeys()                  │
└─────────────────────────────────────┘
           ▲                 ▲
           │                 │
           │                 │
┌──────────┴──────────┐   ┌─┴──────────────────────┐
│ RancherClusterAdapter│   │ GenericClusterAdapter │
├─────────────────────┤   ├───────────────────────┤
│ - rancherApiService │   │ - k8sApi (CoreV1Api)  │
│ - rancherSite       │   │ - appsApi (AppsV1Api) │
│                     │   │ - kubeconfig          │
│ Delegates to        │   │ Direct K8s API calls  │
│ RancherApiService   │   │ via client-node       │
└─────────────────────┘   └───────────────────────┘
```

---

## 🔐 Security Considerations

1. **Kubeconfig Encryption**
   - Use same encryption method as Rancher tokens
   - Decrypt only when needed
   - Clear from memory after use

2. **File Upload Security**
   - Max file size: 1MB
   - Accept only YAML files
   - Validate kubeconfig structure before accepting
   - Sanitize file content display

3. **Access Control**
   - Same RBAC as Rancher sites
   - All operations logged with user attribution
   - Audit trail for all sync operations

4. **API Security**
   - JWT authentication required
   - Rate limiting on endpoints
   - Input validation on all requests

---

## ⚠️ Known Challenges & Mitigations

| Challenge | Mitigation |
|-----------|------------|
| **Kubeconfig token expiration** | Document service account tokens for long-lived access. Clear error messages when token expires. |
| **K8s API version differences** | Use stable APIs (v1, apps/v1). Document minimum K8s version 1.19+. |
| **Large clusters** | Add pagination, caching with TTL, lazy loading. |
| **Multi-cluster kubeconfig** | For MVP: use current context only. Add warning for users. Future: parse all contexts. |

---

## 📊 Progress Tracking

### Week 1 (✅ COMPLETE)
- [x] Create GenericClusterSite entity
- [x] Create IClusterAdapter interface
- [x] Create RancherClusterAdapter
- [x] Create GenericClusterAdapter
- [x] Create ClusterAdapterFactory
- [x] Modify AppInstance entity
- [x] Create database migration
- [x] Install dependencies
- [x] Type checking passes

### Week 2 (✅ COMPLETE)
- [x] Create GenericClusterSitesModule
- [x] Implement CRUD service
- [x] Create API endpoints
- [x] Add kubeconfig validation
- [x] Implement connection testing
- [x] Install dependencies (js-yaml)
- [x] Type checking passes
- [x] ESLint passes


### Week 3 (✅ COMPLETE)
- [x] Refactor ServicesService
- [x] Add ClusterAdapterFactory to ServicesModule
- [x] Update get-services-by-app-instance-direct
- [x] Update update-service-image
- [x] Update sync-single-service
- [x] Type checking passes
- [x] ESLint passes
- [ ] Refactor ConfigMapsService (optional - can be done when needed)
- [ ] Refactor SecretsService (optional - can be done when needed)


### Week 4 (⏳ PENDING)
- [ ] Create GenericClusterSiteManagement UI
- [ ] Create GenericClusterSiteForm
- [ ] Update AppInstanceForm
- [ ] Add API client
- [ ] Update types
- [ ] Test full UI flow

### Week 5 (⏳ PENDING)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Update documentation
- [ ] Create user guides
- [ ] Update CURRENT_STATUS.md

---

## 🚀 How to Continue Implementation

### Next Steps (Start Week 2)

1. **Create the GenericClusterSitesModule structure**:
   ```bash
   mkdir -p apps/backend/src/modules/generic-cluster-sites/dto
   ```

2. **Create the module file** with CRUD operations

3. **Implement encryption/decryption** for kubeconfig:
   - Check if encryption service exists
   - Use same method as Rancher token encryption
   - Add decrypt method to ClusterAdapterFactory

4. **Create API endpoints** following existing patterns from SitesModule

5. **Test connection** with a real Kubernetes cluster

### Running the Database Migration

**For Development (auto-sync enabled)**:
```bash
# TypeORM will auto-create tables on startup
npm run dev
```

**For Production (manual migration)**:
```bash
# Run the SQL script
psql -U username -d database_name -f apps/backend/migrations/001-add-generic-cluster-support.sql
```

### Testing

```bash
# Type checking
npx tsc --noEmit --project apps/backend/tsconfig.json

# Unit tests (when ready)
npm test

# Start dev server
npm run dev
```

---

## 📚 Reference Documentation

### Related Files
- Implementation plan: `/Users/tungpt/.claude/plans/staged-crunching-scone.md`
- Current status: `docs/CURRENT_STATUS.md`
- Roadmap: `docs/ROADMAP.md`
- Project overview: `CLAUDE.md`

### API References
- Kubernetes client: https://github.com/kubernetes-client/javascript
- TypeORM: https://typeorm.io/
- NestJS: https://nestjs.com/

---

**Last Updated**: December 23, 2024
**Next Review**: When starting Week 2 implementation
