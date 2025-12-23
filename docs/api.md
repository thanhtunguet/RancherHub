---
layout: api
title: API Documentation
description: Complete API reference for Rancher Hub backend
---

# API Documentation

Rancher Hub provides a comprehensive REST API for programmatic access to all features. The API is fully documented with Swagger/OpenAPI.

## Base URL

When running locally:
```
http://localhost:3000
```

For production deployments, use your configured domain.

## Authentication

All API endpoints (except login) require authentication via JWT tokens.

### Login Flow

1. **POST** `/auth/login` - Authenticate and receive JWT token
2. Include the token in subsequent requests: `Authorization: Bearer <token>`
3. If 2FA is enabled, you'll need to verify with `/auth/verify-2fa`

## API Endpoints

### Authentication Endpoints

- `POST /auth/login` - User authentication
- `POST /auth/setup-2fa` - Setup two-factor authentication
- `POST /auth/verify-2fa` - Verify 2FA token
- `POST /auth/disable-2fa` - Disable 2FA
- `POST /auth/change-password` - Change user password

### User Management Endpoints

- `GET /users` - List all users
- `POST /users` - Create new user
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Site Management Endpoints

- `GET /sites` - List Rancher sites
- `POST /sites` - Create Rancher site
- `PUT /sites/:id` - Update Rancher site
- `DELETE /sites/:id` - Delete Rancher site
- `POST /sites/:id/test` - Test site connection
- `GET /sites/:id/clusters` - Get clusters from site
- `GET /sites/:id/namespaces` - Get namespaces from cluster

### Generic Kubernetes Clusters Endpoints

- `GET /api/generic-clusters` - List generic Kubernetes clusters
- `POST /api/generic-clusters` - Create generic Kubernetes cluster (with kubeconfig)
- `GET /api/generic-clusters/:id` - Get generic Kubernetes cluster by ID
- `PUT /api/generic-clusters/:id` - Update generic Kubernetes cluster
- `DELETE /api/generic-clusters/:id` - Delete generic Kubernetes cluster
- `POST /api/generic-clusters/:id/test` - Test connection to generic cluster
- `POST /api/generic-clusters/:id/set-active` - Set cluster as active/inactive
- `GET /api/generic-clusters/:id/namespaces` - Get namespaces from generic cluster

### Harbor Registry Endpoints

- `GET /harbor-sites` - List Harbor sites
- `POST /harbor-sites` - Create Harbor site
- `PUT /harbor-sites/:id` - Update Harbor site
- `DELETE /harbor-sites/:id` - Delete Harbor site
- `POST /harbor-sites/:id/test` - Test Harbor connection

### Environment & App Instance Endpoints

- `GET /environments` - List environments
- `POST /environments` - Create environment
- `PUT /environments/:id` - Update environment
- `DELETE /environments/:id` - Delete environment
- `GET /app-instances` - List app instances
- `POST /app-instances` - Create app instance
- `PUT /app-instances/:id` - Update app instance
- `DELETE /app-instances/:id` - Delete app instance

### Service Management Endpoints

- `GET /services` - List services with filtering
- `POST /services/sync` - Synchronize services
- `GET /services/sync/history` - Get sync history

### ConfigMap Management Endpoints

- `GET /configmaps/compare` - Compare ConfigMaps between instances
- `POST /configmaps/sync` - Sync ConfigMap keys
- `GET /configmaps/:appInstanceId` - Get ConfigMaps for app instance

### Monitoring Endpoints

- `GET /monitoring/config` - Get monitoring configuration
- `PUT /monitoring/config` - Update monitoring configuration
- `POST /monitoring/config/test-telegram` - Test Telegram connection
- `GET /monitoring/instances` - Get monitored instances
- `POST /monitoring/instances` - Add instance to monitoring
- `PUT /monitoring/instances/:id` - Update monitored instance
- `GET /monitoring/history` - Get monitoring history
- `GET /monitoring/alerts` - Get alert history

## Interactive API Documentation

The interactive Swagger UI below provides complete API documentation with:
- Complete endpoint documentation
- Request/response schemas
- Interactive API testing
- Authentication support
- Example requests and responses

### Using the Swagger UI

1. **Configure Server URL**: Click the server dropdown at the top of the Swagger UI to select or configure your API server:
   - **Local Development**: `http://localhost:3000`
   - **Docker Compose**: `http://localhost:8080/api` (if using Nginx proxy)
   - **Production**: Your configured domain

2. **Authenticate**: 
   - Click the "Authorize" button at the top
   - Enter your JWT token (obtained from `/api/auth/login`)
   - Click "Authorize" to enable authenticated requests

3. **Test Endpoints**: 
   - Expand any endpoint to see details
   - Click "Try it out" to test the endpoint
   - Fill in required parameters
   - Click "Execute" to send the request

> **Note**: The Swagger UI loads the API specification from the repository. Make sure your API server is running and accessible at the configured server URL.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

## Rate Limiting

API endpoints have rate limiting to prevent abuse:
- General endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

## Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Examples

### Authenticate and Get Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### List Rancher Sites

```bash
curl -X GET http://localhost:3000/sites \
  -H "Authorization: Bearer <your-token>"
```

### Sync Services

```bash
curl -X POST http://localhost:3000/services/sync \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAppInstanceId": 1,
    "targetAppInstanceId": 2,
    "serviceNames": ["api-gateway", "auth-service"]
  }'
```

For more examples and detailed documentation, visit the Swagger UI at `/api/docs`.
