const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('Testing Backend API Endpoints...\n');

    try {
        // Test 1: Get all environments
        console.log('1. Testing GET /api/environments');
        const environmentsResponse = await axios.get(`${API_BASE_URL}/api/environments`);
        console.log(`✅ Found ${environmentsResponse.data.length} environments`);

        if (environmentsResponse.data.length === 0) {
            console.log('❌ No environments found. Please create environments first.');
            return;
        }

        const firstEnvironment = environmentsResponse.data[0];
        console.log(`   Using environment: ${firstEnvironment.name} (${firstEnvironment.id})\n`);

        // Test 2: Get app instances for environment
        console.log('2. Testing GET /api/app-instances/by-environment/:environmentId');
        const appInstancesResponse = await axios.get(`${API_BASE_URL}/api/app-instances/by-environment/${firstEnvironment.id}`);
        console.log(`✅ Found ${appInstancesResponse.data.length} app instances for environment`);

        if (appInstancesResponse.data.length === 0) {
            console.log('❌ No app instances found. Please create app instances first.');
            return;
        }

        const firstAppInstance = appInstancesResponse.data[0];
        console.log(`   Using app instance: ${firstAppInstance.name} (${firstAppInstance.id})\n`);

        // Test 3: Get services by environment
        console.log('3. Testing GET /api/services?env=:environmentId');
        const servicesByEnvResponse = await axios.get(`${API_BASE_URL}/api/services`, {
            params: { env: firstEnvironment.id }
        });
        console.log(`✅ Found ${servicesByEnvResponse.data.length} services for environment\n`);

        // Test 4: Get services by app instance
        console.log('4. Testing GET /api/services/by-app-instance/:appInstanceId');
        const servicesByAppInstanceResponse = await axios.get(`${API_BASE_URL}/api/services/by-app-instance/${firstAppInstance.id}`);
        console.log(`✅ Found ${servicesByAppInstanceResponse.data.length} services for app instance\n`);

        // Test 5: Get workload types
        console.log('5. Testing GET /api/services/workload-types?env=:environmentId');
        const workloadTypesResponse = await axios.get(`${API_BASE_URL}/api/services/workload-types`, {
            params: { env: firstEnvironment.id }
        });
        console.log(`✅ Found workload types: ${workloadTypesResponse.data.types.join(', ')}\n`);

        // Test 6: Test with search filter
        console.log('6. Testing GET /api/services?env=:environmentId&search=test');
        const searchResponse = await axios.get(`${API_BASE_URL}/api/services`, {
            params: {
                env: firstEnvironment.id,
                search: 'test'
            }
        });
        console.log(`✅ Found ${searchResponse.data.length} services matching search "test"\n`);

        // Test 7: Debug app instances
        console.log('7. Testing GET /api/services/debug/app-instances/:environmentId');
        const debugResponse = await axios.get(`${API_BASE_URL}/api/services/debug/app-instances/${firstEnvironment.id}`);
        console.log(`✅ Debug info: ${debugResponse.data.appInstancesCount} app instances found\n`);

        console.log('🎉 All API tests passed! The backend is working correctly.');

    } catch (error) {
        console.error('❌ API test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Run the test
testAPI(); 