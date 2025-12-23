# Multi-Cluster Type Support - Implementation Plan

## Executive Summary
Add support for generic Kubernetes clusters (EKS, GKE, AKS, vanilla K8s) alongside existing Rancher clusters using an adapter pattern. Users will upload kubeconfig files for direct cluster access. **Full backward compatibility maintained - existing Rancher sites work unchanged.**

## User Requirements (Confirmed)
✅ **Authentication**: Kubeconfig file upload
✅ **Scope**: Generic cluster type only (not separate EKS/GKE/AKS types)
✅ **Migration**: Auto-migrate existing data with defaults
✅ **Discovery**: Each GenericClusterSite = one cluster

---

## Architecture Design

### 1. Database Schema

**New Entity: GenericClusterSite**
```typescript
@Entity('generic_cluster_sites')
export class GenericClusterSite {
  id: string (UUID)
  name: string
  kubeconfig: string (encrypted)
  clusterName: string (extracted from kubeconfig)
  serverUrl: string (extracted from kubeconfig)
  active: boolean
  createdAt/updatedAt: Date
}
```

**Modified Entity: AppInstance**
```typescript
@Entity('app_instances')
export class AppInstance {
  // Existing fields unchanged
  id, name, cluster, namespace, environmentId, timestamps

  // NEW: Cluster type discriminator
  clusterType: 'rancher' | 'generic' (default: 'rancher')

  // Modified: Both FKs now nullable with CHECK constraint
  rancherSiteId: string | null
  genericClusterSiteId: string | null

  // NEW: Conditional relationships
  rancherSite: RancherSite | null
  genericClusterSite: GenericClusterSite | null
}
```

**Migration Strategy**:
1. Create `generic_cluster_sites` table
2. Add `cluster_type` (default 'rancher') and `generic_cluster_site_id` to `app_instances`
3. Make `rancher_site_id` nullable
4. Add CHECK: exactly one site FK must be non-null based on cluster type
5. Auto-set `clusterType='rancher'` for all existing rows

### 2. Adapter Pattern

**Core Interface** (`IClusterAdapter`):
```typescript
interface IClusterAdapter {
  testConnection(): Promise<{success, message, data?}>
  getNamespaces(clusterId?): Promise<RancherNamespace[]>
  getDeployments(clusterId, namespace): Promise<RancherWorkload[]>
  updateWorkloadImage(clusterId, namespace, name, type, newImage): Promise<any>
  getConfigMaps(clusterId, namespace): Promise<any[]>
  updateConfigMapKey(clusterId, namespace, cmName, key, value): Promise<any>
  syncConfigMapKeys(clusterId, namespace, cmName, keys): Promise<any>
  getSecrets(clusterId, namespace): Promise<any[]>
  updateSecretKey(clusterId, namespace, secretName, key, value): Promise<any>
  syncSecretKeys(clusterId, namespace, secretName, keys): Promise<any>
}
```

**RancherClusterAdapter**:
- Thin wrapper around existing `RancherApiService`
- No business logic changes
- Delegates all calls to RancherApiService methods

**GenericClusterAdapter**:
- Uses `@kubernetes/client-node` library
- Loads kubeconfig and creates K8s API clients
- Direct Kubernetes API access (CoreV1Api, AppsV1Api)
- `clusterId` parameter ignored (single cluster per site)

**ClusterAdapterFactory**:
- Dependency-injected service
- `createAdapter(appInstance)` - returns appropriate adapter based on `clusterType`
- `createAdapterFromSite(siteType, siteId)` - for site-level operations

### 3. Backend Service Refactoring

**Pattern for all services** (Services, ConfigMaps, Secrets):
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

**Services to refactor**:
- `ServicesService` - all methods in `services.service/` directory
- `ConfigMapsService` - comparison and sync methods
- `SecretsService` - comparison and sync methods
- `AppInstancesService` - add cluster type validation, load both site relations

---

## Implementation Phases (5 Weeks)

### Week 1: Database & Core Infrastructure
**Tasks**:
1. Create database migration with backward compatibility
2. Create `GenericClusterSite` entity and module
3. Implement `IClusterAdapter` interface
4. Implement `RancherClusterAdapter` (wrap existing code)
5. Test: All existing tests pass, no breaking changes

**Deliverables**:
- Migration script (forward + rollback)
- GenericClusterSite entity
- Adapter interface and Rancher adapter

### Week 2: GenericClusterAdapter & Factory
**Tasks**:
1. Install `@kubernetes/client-node` dependency
2. Implement `GenericClusterAdapter` with all interface methods
3. Implement `ClusterAdapterFactory`
4. Create `GenericClusterSitesModule` with CRUD endpoints
5. Add kubeconfig validation and parsing
6. Test: Connect to real generic cluster

**Deliverables**:
- Working GenericClusterAdapter
- ClusterAdapterFactory
- GenericClusterSites API endpoints

**Critical Files**:
- `apps/backend/src/adapters/generic-cluster.adapter.ts` (new)
- `apps/backend/src/adapters/cluster-adapter.factory.ts` (new)
- `apps/backend/src/modules/generic-cluster-sites/` (new module)

### Week 3: Service Layer Refactoring
**Tasks**:
1. Refactor `ServicesService` to use adapters
2. Refactor `ConfigMapsService` to use adapters
3. Refactor `SecretsService` to use adapters
4. Update `AppInstancesService` for cluster type validation
5. Update all queries to load both site relations
6. Test: All operations work with both cluster types

**Deliverables**:
- Refactored backend services
- Comprehensive tests

**Critical Files**:
- `apps/backend/src/modules/services/services.service/get-services-by-app-instance-direct.ts`
- `apps/backend/src/modules/services/services.service/sync-single-service.ts`
- `apps/backend/src/modules/configmaps/configmaps.service.ts`
- `apps/backend/src/modules/secrets/secrets.service.ts`
- `apps/backend/src/modules/app-instances/app-instances.service.ts`

### Week 4: Frontend Implementation
**Tasks**:
1. Create `GenericClusterSiteManagement` component
2. Create `GenericClusterSiteForm` with kubeconfig file upload
3. Update `AppInstanceForm` with cluster type selector
4. Update cascading dropdowns for conditional site selection
5. Add `genericClusterSitesApi` client
6. Update TypeScript types
7. Test: Full CRUD flow for both cluster types

**Deliverables**:
- Generic cluster sites management UI
- Updated app instance form
- Working end-to-end flow

**Critical Files**:
- `apps/frontend/src/components/generic-cluster-sites/GenericClusterSiteManagement.tsx` (new)
- `apps/frontend/src/components/generic-cluster-sites/GenericClusterSiteForm.tsx` (new)
- `apps/frontend/src/components/app-instances/AppInstanceForm.tsx`
- `apps/frontend/src/services/api.ts`
- `apps/frontend/src/types/index.ts`

**UI Components**:
- Generic Cluster Sites page (mirror Sites page structure)
- Kubeconfig file upload with Upload component
- Cluster type selector (Radio/Select in AppInstanceForm)
- Conditional site dropdown based on cluster type

### Week 5: Testing & Documentation
**Tasks**:
1. End-to-end testing with real clusters (Rancher + generic)
2. Test service sync between different cluster types
3. Test ConfigMap/Secret sync between cluster types
4. Update Swagger API documentation
5. Update README.md with generic cluster setup
6. Create kubeconfig generation guide
7. Update CURRENT_STATUS.md and ROADMAP.md

**Deliverables**:
- Comprehensive test coverage
- Complete documentation
- Production-ready deployment

---

## API Design

### New Endpoints (GenericClusterSites)
```
POST   /api/generic-cluster-sites          Create generic cluster site
GET    /api/generic-cluster-sites          List all sites
GET    /api/generic-cluster-sites/:id      Get site by ID
PUT    /api/generic-cluster-sites/:id      Update site
DELETE /api/generic-cluster-sites/:id      Delete site
POST   /api/generic-cluster-sites/:id/test Test connection
GET    /api/generic-cluster-sites/:id/namespaces Get namespaces
```

### Modified Endpoints (AppInstances)
```typescript
// Updated DTO
interface CreateAppInstanceDto {
  name: string
  cluster: string
  namespace: string
  environmentId: string
  clusterType: 'rancher' | 'generic'
  rancherSiteId?: string       // Required if clusterType='rancher'
  genericClusterSiteId?: string // Required if clusterType='generic'
}
```

---

## Backward Compatibility Guarantees

✅ **Database**: Auto-migration with default values, fully reversible
✅ **API**: All existing endpoints work unchanged
✅ **Frontend**: Default behavior remains Rancher-first
✅ **No Data Loss**: All existing sites and instances preserved
✅ **No Breaking Changes**: Zero impact on existing users

---

## Security Considerations

1. **Kubeconfig Encryption**: Same encryption as Rancher tokens
2. **Access Control**: Same RBAC as Rancher sites
3. **File Upload**: 1MB limit, YAML validation, content sanitization
4. **Certificate Validation**: Respect kubeconfig cert settings
5. **Audit Logging**: All operations logged with user attribution

---

## Known Challenges & Mitigations

| Challenge | Mitigation |
|-----------|------------|
| Kubeconfig token expiration | Document service account tokens, clear error messages |
| K8s API version differences | Use stable APIs (v1, apps/v1), detect version, document min K8s 1.19+ |
| Large clusters (1000s of namespaces) | Add pagination, caching with TTL, lazy loading |
| Multi-cluster kubeconfig | For MVP: use current context only with warning |

---

## Critical Files Summary

### New Files (13)
**Backend**:
- `apps/backend/src/entities/generic-cluster-site.entity.ts`
- `apps/backend/src/adapters/cluster-adapter.interface.ts`
- `apps/backend/src/adapters/rancher-cluster.adapter.ts`
- `apps/backend/src/adapters/generic-cluster.adapter.ts`
- `apps/backend/src/adapters/cluster-adapter.factory.ts`
- `apps/backend/src/modules/generic-cluster-sites/*` (module, controller, service, DTOs)

**Frontend**:
- `apps/frontend/src/components/generic-cluster-sites/GenericClusterSiteManagement.tsx`
- `apps/frontend/src/components/generic-cluster-sites/GenericClusterSiteForm.tsx`
- `apps/frontend/src/components/generic-cluster-sites/GenericClusterSiteCard.tsx`

### Modified Files (8)
**Backend**:
- `apps/backend/src/entities/app-instance.entity.ts` - Add cluster type and dual FKs
- `apps/backend/src/modules/app-instances/app-instances.service.ts` - Cluster type validation
- `apps/backend/src/modules/services/services.service/*` - Use adapters
- `apps/backend/src/modules/configmaps/configmaps.service.ts` - Use adapters
- `apps/backend/src/modules/secrets/secrets.service.ts` - Use adapters

**Frontend**:
- `apps/frontend/src/components/app-instances/AppInstanceForm.tsx` - Cluster type selector
- `apps/frontend/src/services/api.ts` - Add genericClusterSitesApi
- `apps/frontend/src/types/index.ts` - New types

---

## Success Criteria

- ✅ All existing Rancher functionality works unchanged
- ✅ Can create generic cluster sites via kubeconfig upload
- ✅ Can create app instances on generic clusters
- ✅ Can discover services, ConfigMaps, Secrets from generic clusters
- ✅ Can sync services between Rancher and generic clusters
- ✅ All tests pass (unit, integration, e2e)
- ✅ Documentation complete and accurate
- ✅ Zero breaking changes for existing users
