"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
const typeorm_1 = require("@nestjs/typeorm");
const generic_cluster_site_entity_1 = require("../src/entities/generic-cluster-site.entity");
const user_entity_1 = require("../src/entities/user.entity");
const bcrypt = require("bcryptjs");
describe('GenericClusterSites (e2e)', () => {
    let app;
    let genericClusterSiteRepository;
    let userRepository;
    let authToken;
    let testUserId;
    const validKubeconfig = `
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://test-cluster.example.com
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: test-token
`;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        genericClusterSiteRepository = moduleFixture.get((0, typeorm_1.getRepositoryToken)(generic_cluster_site_entity_1.GenericClusterSite));
        userRepository = moduleFixture.get((0, typeorm_1.getRepositoryToken)(user_entity_1.User));
        const hashedPassword = await bcrypt.hash('testpass123', 12);
        const testUser = userRepository.create({
            username: 'testuser',
            password: hashedPassword,
            email: 'test@example.com',
            twoFactorEnabled: false,
        });
        const savedUser = await userRepository.save(testUser);
        testUserId = savedUser.id;
        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
            username: 'testuser',
            password: 'testpass123',
        });
        authToken = loginResponse.body.access_token;
    });
    afterAll(async () => {
        await genericClusterSiteRepository.delete({});
        await userRepository.delete({ id: testUserId });
        await app.close();
    });
    describe('/api/generic-clusters (POST)', () => {
        it('should create a generic cluster', () => {
            return request(app.getHttpServer())
                .post('/api/generic-clusters')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Test EKS Cluster',
                kubeconfig: validKubeconfig,
            })
                .expect(201)
                .expect((res) => {
                expect(res.body).toHaveProperty('id');
                expect(res.body.name).toBe('Test EKS Cluster');
                expect(res.body.clusterName).toBe('test-cluster');
                expect(res.body.serverUrl).toBe('https://test-cluster.example.com');
            });
        });
        it('should reject invalid kubeconfig', () => {
            return request(app.getHttpServer())
                .post('/api/generic-clusters')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Invalid Cluster',
                kubeconfig: 'invalid-yaml',
            })
                .expect(400);
        });
        it('should require authentication', () => {
            return request(app.getHttpServer())
                .post('/api/generic-clusters')
                .send({
                name: 'Test Cluster',
                kubeconfig: validKubeconfig,
            })
                .expect(401);
        });
    });
    describe('/api/generic-clusters (GET)', () => {
        it('should return all generic clusters', async () => {
            const site = genericClusterSiteRepository.create({
                name: 'List Test Cluster',
                kubeconfig: validKubeconfig,
                clusterName: 'test-cluster',
                serverUrl: 'https://test-cluster.example.com',
                active: true,
            });
            await genericClusterSiteRepository.save(site);
            return request(app.getHttpServer())
                .get('/api/generic-clusters')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBeGreaterThan(0);
            });
        });
    });
    describe('/api/generic-clusters/:id (GET)', () => {
        it('should return a specific generic cluster', async () => {
            const site = genericClusterSiteRepository.create({
                name: 'Get Test Cluster',
                kubeconfig: validKubeconfig,
                clusterName: 'test-cluster',
                serverUrl: 'https://test-cluster.example.com',
                active: true,
            });
            const savedSite = await genericClusterSiteRepository.save(site);
            return request(app.getHttpServer())
                .get(`/api/generic-clusters/${savedSite.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(res.body.id).toBe(savedSite.id);
                expect(res.body.name).toBe('Get Test Cluster');
            });
        });
        it('should return 404 for non-existent cluster', () => {
            return request(app.getHttpServer())
                .get('/api/generic-clusters/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });
    describe('/api/generic-clusters/:id (PUT)', () => {
        it('should update a generic cluster', async () => {
            const site = genericClusterSiteRepository.create({
                name: 'Update Test Cluster',
                kubeconfig: validKubeconfig,
                clusterName: 'test-cluster',
                serverUrl: 'https://test-cluster.example.com',
                active: true,
            });
            const savedSite = await genericClusterSiteRepository.save(site);
            return request(app.getHttpServer())
                .put(`/api/generic-clusters/${savedSite.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Updated Cluster Name',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.name).toBe('Updated Cluster Name');
            });
        });
    });
    describe('/api/generic-clusters/:id/test (POST)', () => {
        it('should test connection to a generic cluster', async () => {
            const site = genericClusterSiteRepository.create({
                name: 'Test Connection Cluster',
                kubeconfig: validKubeconfig,
                clusterName: 'test-cluster',
                serverUrl: 'https://test-cluster.example.com',
                active: true,
            });
            const savedSite = await genericClusterSiteRepository.save(site);
            return request(app.getHttpServer())
                .post(`/api/generic-clusters/${savedSite.id}/test`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('success');
                expect(res.body).toHaveProperty('message');
            });
        });
    });
    describe('/api/generic-clusters/:id/set-active (POST)', () => {
        it('should set a cluster as active', async () => {
            const site1 = genericClusterSiteRepository.create({
                name: 'Active Cluster 1',
                kubeconfig: validKubeconfig,
                clusterName: 'test-cluster',
                serverUrl: 'https://test-cluster.example.com',
                active: false,
            });
            const savedSite1 = await genericClusterSiteRepository.save(site1);
            return request(app.getHttpServer())
                .post(`/api/generic-clusters/${savedSite1.id}/set-active`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ active: true })
                .expect(200)
                .expect((res) => {
                expect(res.body.active).toBe(true);
            });
        });
    });
    describe('/api/generic-clusters/:id/namespaces (GET)', () => {
        it('should get namespaces from a generic cluster', async () => {
            const site = genericClusterSiteRepository.create({
                name: 'Namespaces Test Cluster',
                kubeconfig: validKubeconfig,
                clusterName: 'test-cluster',
                serverUrl: 'https://test-cluster.example.com',
                active: true,
            });
            const savedSite = await genericClusterSiteRepository.save(site);
            return request(app.getHttpServer())
                .get(`/api/generic-clusters/${savedSite.id}/namespaces`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
        });
    });
    describe('/api/generic-clusters/:id (DELETE)', () => {
        it('should delete a generic cluster', async () => {
            const site = genericClusterSiteRepository.create({
                name: 'Delete Test Cluster',
                kubeconfig: validKubeconfig,
                clusterName: 'test-cluster',
                serverUrl: 'https://test-cluster.example.com',
                active: true,
            });
            const savedSite = await genericClusterSiteRepository.save(site);
            return request(app.getHttpServer())
                .delete(`/api/generic-clusters/${savedSite.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
        });
    });
});
//# sourceMappingURL=generic-cluster-sites.e2e-spec.js.map