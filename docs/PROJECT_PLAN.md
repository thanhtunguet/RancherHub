# Rancher Sync Manager - Project Plan

## 1. Roadmap by Phase

### Phase 1: Minimum Viable Product (MVP) - 3 Weeks

**Week 1: Core Setup and Authentication**
- Set up project structure (frontend and backend)
- Implement Rancher Site management
- Create popup for first site addition
- Implement basic authentication flow with Rancher API
- Set up database schema and ORM models

**Week 2: Environment and AppInstance Management**
- Implement Environment CRUD operations
- Implement AppInstance CRUD operations
- Create UI for managing environments and AppInstances
- Implement cluster and namespace selection
- Set up relationship between Environments and AppInstances

**Week 3: Service Management and Basic Synchronization**
- Implement service fetching from Rancher API
- Create service listing UI with filtering
- Implement basic service synchronization between environments
- Add confirmation modals for synchronization
- Implement basic error handling

### Phase 2: Core Features Enhancement - 2 Weeks

**Week 4: UX Improvements and Enhanced Functionality**
- Improve UI/UX for all management interfaces
- Implement advanced service filtering and searching
- Add sync history tracking and visualization
- Improve service status display with visual indicators
- Add token encryption for enhanced security

**Week 5: Testing and Stability**
- Comprehensive testing across all features
- Fix bugs and edge cases
- Performance optimization for service listing
- Improve error handling and user feedback
- Documentation updates

### Phase 3: Advanced Features - 3 Weeks

**Week 6-7: Advanced Synchronization Features**
- Implement service comparison between environments
- Add differential updates and visualization
- Implement batch synchronization operations
- Add rollback capabilities for failed syncs
- Create dashboards for synchronization metrics

**Week 8: Polish and Additional Features**
- Implement dark/light mode
- Add user preferences and settings
- Create comprehensive reports and analytics
- Implement optional notifications for sync operations
- Final testing and performance tuning

## 2. System Design: Frontend/Backend Architecture

### Frontend Architecture

The frontend is built using React with Tailwind CSS and Ant Design 5 components, with a clear separation of concerns through modular components:

```
+--------------------------------------+
|             App Component            |
+--------------------------------------+
         |            |           |
         v            v           v
+-------------+ +----------+ +-----------+
|   Auth/     | |          | |           |
| Site Module | |   ENV    | | Services  |
|             | |  Module  | |  Module   |
+-------------+ +----------+ +-----------+
                     |            |
                     v            v
               +-------------+ +----------+
               | AppInstance | |   Sync   |
               |   Module    | |  Module  |
               +-------------+ +----------+
```

**Key Components:**

1. **Auth/Site Module**
   - Handles Rancher site management
   - Manages site selection and authentication
   - Stores site information in local storage

2. **Environment Module**
   - Manages environment CRUD operations
   - Handles environment selection
   - Provides environment context to child components

3. **AppInstance Module**
   - Manages AppInstance CRUD operations
   - Handles cluster and namespace selection
   - Links AppInstances to environments

4. **Services Module**
   - Displays services from all AppInstances in selected environment
   - Handles service filtering and search
   - Provides service selection for synchronization

5. **Sync Module**
   - Handles synchronization operations
   - Provides synchronization confirmation UI
   - Displays synchronization history

**State Management:**
- Zustand for global state (selected site, selected environment)
- React Query for API data fetching and caching
- Local component state for UI elements

### Backend Architecture

The backend is implemented using NestJS with a modular architecture:

```
+--------------------------------------------------------------------+
| NestJS Application                                             |
|----------------------------------------------------------------|
| +------------+  +------------+  +------------+  +------------+ |
|                                                                |
|                                                                |
|                                                                |
|                                                                |
| +------------+  +------------+  +------------+  +------------+ |
|                                                                |
| +------------+  +------------+  +------------+  +------------+ |
|                                                                |
|                                                                |
|                                                                |
|                                                                |
| +------------+  +------------+  +------------+  +------------+ |
|                                                                |
+--------------------------------------------------------------------+
```

**Key Modules:**

1. **Sites Module**
   - Handles Rancher site CRUD operations
   - Manages site testing and validation

2. **Environment Module**
   - Manages environment CRUD operations
   - Provides environment context

3. **AppInstance Module**
   - Manages AppInstance CRUD operations
   - Handles relationships between environments and sites

4. **Services Module**
   - Fetches services from Rancher API
   - Aggregates services across AppInstances

5. **Sync Module**
   - Implements synchronization logic
   - Records synchronization history
   - Provides rollback capabilities

6. **Rancher Repository**
   - Encapsulates all Rancher API interactions
   - Handles authentication and error management
   - Provides abstraction for Kubernetes operations

## 3. Data Structures and Key Entities

### RancherSite

```typescript
interface RancherSite {
  id: string;           // Unique identifier
  name: string;         // Display name for the site
  url: string;          // Rancher server URL
  token: string;        // API token (encrypted in storage)
  active: boolean;      // Whether this site is currently active
  createdAt: Date;      // Creation timestamp
  updatedAt: Date;      // Last update timestamp
}
```

### Environment

```typescript
interface Environment {
  id: string;           // Unique identifier
  name: string;         // Environment name (Dev, Stage, Prod, etc.)
  description: string;  // Optional description
  color: string;        // Color code for UI display
  createdAt: Date;      // Creation timestamp
  updatedAt: Date;      // Last update timestamp
}
```

### AppInstance

```typescript
interface AppInstance {
  id: string;           // Unique identifier
  name: string;         // Display name
  rancherSiteId: string; // Associated Rancher site
  cluster: string;      // Kubernetes cluster name
  namespace: string;    // Kubernetes namespace
  environmentId: string; // Associated environment
  createdAt: Date;      // Creation timestamp
  updatedAt: Date;      // Last update timestamp
}
```

### Service

```typescript
interface Service {
  id: string;           // Unique identifier (usually namespace/name)
  name: string;         // Service name
  appInstanceId: string; // Associated AppInstance
  status: string;       // Current status (running, failed, etc.)
  replicas: number;     // Desired replicas
  availableReplicas: number; // Available replicas
  imageTag: string;     // Current image tag
  workloadType: string; // Deployment, StatefulSet, etc.
  lastSynced: Date;     // Last synchronization timestamp
}
```

### SyncOperation

```typescript
interface SyncOperation {
  id: string;           // Unique identifier
  sourceEnvironmentId: string; // Source environment
  targetEnvironmentId: string; // Target environment
  serviceIds: string[]; // Services to synchronize
  status: string;       // Operation status (pending, complete, failed)
  startTime: Date;      // Start timestamp
  endTime: Date;        // End timestamp
  initiatedBy: string;  // User who initiated the sync
}
```

### SyncHistory

```typescript
interface SyncHistory {
  id: string;           // Unique identifier
  syncOperationId: string; // Associated operation
  serviceId: string;    // Service that was synchronized
  sourceAppInstanceId: string; // Source AppInstance
  targetAppInstanceId: string; // Target AppInstance
  previousImageTag: string; // Previous image tag
  newImageTag: string;  // New image tag
  status: string;       // Status (success, failed)
  timestamp: Date;      // Timestamp
  error: string;        // Error message if failed
}
```

## 4. API List with Sample Payloads

### Sites API

**Create a new Rancher site**
```
POST /api/sites
Content-Type: application/json

Request:
{
  "name": "Production Rancher",
  "url": "https://rancher.example.com",
  "token": "token-abc123"
}

Response:
{
  "id": "site-1",
  "name": "Production Rancher",
  "url": "https://rancher.example.com",
  "active": true,
  "createdAt": "2023-06-10T12:00:00Z",
  "updatedAt": "2023-06-10T12:00:00Z"
}
```

**Get all Rancher sites**
```
GET /api/sites

Response:
[
  {
    "id": "site-1",
    "name": "Production Rancher",
    "url": "https://rancher.example.com",
    "active": true,
    "createdAt": "2023-06-10T12:00:00Z",
    "updatedAt": "2023-06-10T12:00:00Z"
  },
  {
    "id": "site-2",
    "name": "Dev Rancher",
    "url": "https://dev-rancher.example.com",
    "active": false,
    "createdAt": "2023-06-11T09:30:00Z",
    "updatedAt": "2023-06-11T09:30:00Z"
  }
]
```

**Test connection to a Rancher site**
```
POST /api/sites/site-1/test

Response:
{
  "success": true,
  "message": "Connection successful"
}
```

### Environments API

**Create a new environment**
```
POST /api/environments
Content-Type: application/json

Request:
{
  "name": "Development",
  "description": "Development environment for feature testing",
  "color": "#4CAF50"
}

Response:
{
  "id": "env-1",
  "name": "Development",
  "description": "Development environment for feature testing",
  "color": "#4CAF50",
  "createdAt": "2023-06-12T14:23:00Z",
  "updatedAt": "2023-06-12T14:23:00Z"
}
```

**Get all environments**
```
GET /api/environments

Response:
[
  {
    "id": "env-1",
    "name": "Development",
    "description": "Development environment for feature testing",
    "color": "#4CAF50",
    "createdAt": "2023-06-12T14:23:00Z",
    "updatedAt": "2023-06-12T14:23:00Z"
  },
  {
    "id": "env-2",
    "name": "Staging",
    "description": "Pre-production testing environment",
    "color": "#2196F3",
    "createdAt": "2023-06-12T14:25:00Z",
    "updatedAt": "2023-06-12T14:25:00Z"
  },
  {
    "id": "env-3",
    "name": "Production",
    "description": "Live production environment",
    "color": "#F44336",
    "createdAt": "2023-06-12T14:27:00Z",
    "updatedAt": "2023-06-12T14:27:00Z"
  }
]
```

### AppInstances API

**Create a new app instance**
```
POST /api/app-instances
Content-Type: application/json

Request:
{
  "name": "Web Frontend Dev",
  "rancherSiteId": "site-1",
  "cluster": "cluster-1",
  "namespace": "frontend-dev",
  "environmentId": "env-1"
}

Response:
{
  "id": "app-1",
  "name": "Web Frontend Dev",
  "rancherSiteId": "site-1",
  "cluster": "cluster-1",
  "namespace": "frontend-dev",
  "environmentId": "env-1",
  "createdAt": "2023-06-12T15:10:00Z",
  "updatedAt": "2023-06-12T15:10:00Z"
}
```

**Get app instances for an environment**
```
GET /api/app-instances?env=env-1

Response:
[
  {
    "id": "app-1",
    "name": "Web Frontend Dev",
    "rancherSiteId": "site-1",
    "cluster": "cluster-1",
    "namespace": "frontend-dev",
    "environmentId": "env-1",
    "createdAt": "2023-06-12T15:10:00Z",
    "updatedAt": "2023-06-12T15:10:00Z"
  },
  {
    "id": "app-2",
    "name": "API Backend Dev",
    "rancherSiteId": "site-1",
    "cluster": "cluster-1",
    "namespace": "backend-dev",
    "environmentId": "env-1",
    "createdAt": "2023-06-12T15:15:00Z",
    "updatedAt": "2023-06-12T15:15:00Z"
  }
]
```

### Services API

**Get all services in an environment**
```
GET /api/services?env=env-1

Response:
[
  {
    "id": "svc-1",
    "name": "frontend",
    "appInstanceId": "app-1",
    "status": "running",
    "replicas": 2,
    "availableReplicas": 2,
    "imageTag": "v1.2.3",
    "workloadType": "Deployment",
    "lastSynced": null
  },
  {
    "id": "svc-2",
    "name": "backend-api",
    "appInstanceId": "app-2",
    "status": "running",
    "replicas": 3,
    "availableReplicas": 3,
    "imageTag": "v1.1.0",
    "workloadType": "Deployment",
    "lastSynced": "2023-06-12T10:30:00Z"
  }
]
```

### Synchronization API

**Synchronize services between environments**
```
POST /api/sync
Content-Type: application/json

Request:
{
  "sourceEnvironmentId": "env-1",
  "targetEnvironmentId": "env-2",
  "serviceIds": ["svc-1", "svc-2"],
  "targetAppInstances": ["app-3", "app-4"]
}

Response:
{
  "id": "sync-1",
  "sourceEnvironmentId": "env-1",
  "targetEnvironmentId": "env-2",
  "serviceIds": ["svc-1", "svc-2"],
  "status": "complete",
  "startTime": "2023-06-13T09:45:00Z",
  "endTime": "2023-06-13T09:46:30Z",
  "initiatedBy": "user1",
  "results": [
    {
      "serviceId": "svc-1",
      "targetAppInstanceId": "app-3",
      "previousImageTag": "v1.2.0",
      "newImageTag": "v1.2.3",
      "status": "success"
    },
    {
      "serviceId": "svc-2",
      "targetAppInstanceId": "app-4",
      "previousImageTag": "v1.0.5",
      "newImageTag": "v1.1.0",
      "status": "success"
    }
  ]
}
```

**Get synchronization history**
```
GET /api/sync/history?env=env-1

Response:
[
  {
    "id": "sync-1",
    "sourceEnvironmentId": "env-1",
    "targetEnvironmentId": "env-2",
    "serviceIds": ["svc-1", "svc-2"],
    "status": "complete",
    "startTime": "2023-06-13T09:45:00Z",
    "endTime": "2023-06-13T09:46:30Z",
    "initiatedBy": "user1"
  },
  {
    "id": "sync-2",
    "sourceEnvironmentId": "env-2",
    "targetEnvironmentId": "env-3",
    "serviceIds": ["svc-5", "svc-6"],
    "status": "failed",
    "startTime": "2023-06-14T10:15:00Z",
    "endTime": "2023-06-14T10:15:45Z",
    "initiatedBy": "user2"
  }
]
```

## 5. Deployment and Testing Plans

### Development Environment Setup

1. **Local Development**
   - Frontend: Vite dev server
   - Backend: NestJS with hot-reload
   - Database: SQLite for simplicity

2. **Containerized Development**
   - Docker Compose for local multi-container setup
   - Mock Rancher API for testing without actual Rancher instances

### Testing Strategy

1. **Unit Testing**
   - Frontend: Jest + React Testing Library
   - Backend: Jest + NestJS testing utilities
   - Coverage target: 80%

2. **Integration Testing**
   - API Testing: Supertest for backend endpoints
   - Service Integration Tests: Mock Rancher API responses

3. **End-to-End Testing**
   - Cypress for critical user flows
   - Key scenarios:
     - Site addition and connection testing
     - Environment creation and management
     - Service synchronization

4. **Performance Testing**
   - Load testing with k6 for API endpoints
   - Focus on service listing with large environments
   - Synchronization operations with multiple services

### Deployment Strategy

1. **CI/CD Pipeline**
   - GitHub Actions for CI/CD
   - Automated tests on pull requests
   - Automated builds for staging deployment

2. **Container Strategy**
   - Docker images for frontend and backend
   - Multi-stage builds for optimized images
   - Kubernetes manifests for deployment

3. **Production Deployment**
   - Backend: Kubernetes deployment with auto-scaling
   - Frontend: Nginx-served static files
   - PostgreSQL database with persistence
   - Secure Ingress with TLS

4. **Monitoring and Logging**
   - Prometheus for metrics collection
   - Grafana for visualization
   - ELK stack for log aggregation
   - Alerts for critical service issues

### Backup and Disaster Recovery

1. **Database Backups**
   - Daily automated backups
   - Point-in-time recovery capability

2. **Application State Recovery**
   - Ability to recover from failed synchronizations
   - Automatic retry mechanisms

3. **Documentation**
   - Detailed deployment guides
   - Troubleshooting documentation
   - Recovery procedures

### Security Measures

1. **Secure Storage**
   - Encryption of sensitive data (tokens)
   - Secure environment variables

2. **API Security**
   - Rate limiting
   - Input validation and sanitization
   - HTTPS enforcement

3. **Access Control**
   - Role-based access control (future enhancement)
   - Audit logging for critical operations
