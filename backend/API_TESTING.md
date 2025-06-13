# Backend API Testing Guide

This guide helps you test the backend API endpoints to ensure they're working correctly for environment and app instance filtering.

## Prerequisites

1. **Backend is running** on `http://localhost:3000`
2. **Database is set up** with some test data
3. **Node.js** is installed for running the test script

## Quick Test

Run the automated test script:

```bash
cd backend
node test-api.js
```

## Manual Testing

### 1. Test Environment Endpoints

```bash
# Get all environments
curl http://localhost:3000/api/environments

# Expected: Array of environments
```

### 2. Test App Instance Endpoints

```bash
# Get app instances for a specific environment
curl "http://localhost:3000/api/app-instances/by-environment/{environmentId}"

# Get all app instances (with optional environment filter)
curl "http://localhost:3000/api/app-instances?env={environmentId}"

# Expected: Array of app instances
```

### 3. Test Services Endpoints

```bash
# Get services by environment
curl "http://localhost:3000/api/services?env={environmentId}"

# Get services by app instance
curl "http://localhost:3000/api/services/by-app-instance/{appInstanceId}"

# Get services with search filter
curl "http://localhost:3000/api/services?env={environmentId}&search=nginx"

# Get services with workload type filter
curl "http://localhost:3000/api/services?env={environmentId}&type=deployment"

# Get workload types for environment
curl "http://localhost:3000/api/services/workload-types?env={environmentId}"

# Expected: Array of services
```

### 4. Debug Endpoints

```bash
# Debug app instances for environment
curl "http://localhost:3000/api/services/debug/app-instances/{environmentId}"

# Debug clusters for site
curl "http://localhost:3000/api/services/debug/clusters/{siteId}"

# Expected: Debug information
```

## Expected API Behavior

### Environment Filtering
- ✅ `GET /api/app-instances/by-environment/{environmentId}` - Returns app instances for specific environment
- ✅ `GET /api/services?env={environmentId}` - Returns all services in environment (across all app instances)

### App Instance Filtering
- ✅ `GET /api/services/by-app-instance/{appInstanceId}` - Returns services for specific app instance

### Search and Type Filtering
- ✅ `GET /api/services?env={environmentId}&search={term}` - Filters services by search term
- ✅ `GET /api/services?env={environmentId}&type={workloadType}` - Filters services by workload type

## Common Issues

### 1. No Environments Found
```
❌ No environments found. Please create environments first.
```
**Solution**: Create environments through the frontend or database

### 2. No App Instances Found
```
❌ No app instances found. Please create app instances first.
```
**Solution**: Create app instances for the environment

### 3. No Services Found
```
✅ Found 0 services for environment
```
**Solution**: 
- Check if Rancher API is accessible
- Verify app instances have valid cluster/namespace
- Check backend logs for API errors

### 4. Connection Refused
```
❌ API test failed: connect ECONNREFUSED
```
**Solution**: 
- Ensure backend is running on port 3000
- Check if database is connected
- Verify all dependencies are installed

## Debugging Steps

### 1. Check Backend Logs
```bash
# Look for debug logs in backend console
# Should see logs like:
# [ServicesController] getServicesByEnvironment called with: { environmentId: '...' }
# [AppInstancesController] Getting app instances for environment: ...
```

### 2. Check Database
```bash
# Verify environments exist
SELECT * FROM environments;

# Verify app instances exist
SELECT * FROM app_instances WHERE environment_id = 'your-environment-id';

# Verify services exist
SELECT * FROM services WHERE app_instance_id = 'your-app-instance-id';
```

### 3. Check Rancher API Connection
```bash
# Test Rancher site connection
curl "http://localhost:3000/api/services/test-api/{siteId}"
```

## Frontend Integration

The frontend expects these exact API endpoints:

- **App Instances**: `GET /api/app-instances/by-environment/{environmentId}`
- **Services by Environment**: `GET /api/services?env={environmentId}`
- **Services by App Instance**: `GET /api/services/by-app-instance/{appInstanceId}`

If the backend is working but frontend still has issues, check:

1. **API Base URL**: Ensure frontend is pointing to correct backend URL
2. **CORS**: Ensure backend allows requests from frontend origin
3. **Network**: Check browser network tab for failed requests

## Troubleshooting

### Backend Not Starting
```bash
# Check if port 3000 is available
lsof -i :3000

# Check backend logs
npm run start:dev
```

### Database Issues
```bash
# Check database connection
# Verify environment variables
# Check database migrations
```

### API Endpoints Not Found
```bash
# Check if routes are registered
# Verify controller imports in app.module.ts
# Check for TypeScript compilation errors
```

## Success Indicators

When everything is working correctly, you should see:

1. ✅ Backend starts without errors
2. ✅ API endpoints return data (not 404/500)
3. ✅ Frontend can fetch environments, app instances, and services
4. ✅ Environment selection filters app instances correctly
5. ✅ App instance selection filters services correctly
6. ✅ Search and status filters work on the filtered results 