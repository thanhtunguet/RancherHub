import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenericClusterSite } from '../src/entities/generic-cluster-site.entity';
import { User } from '../src/entities/user.entity';
import * as bcrypt from 'bcryptjs';

describe('GenericClusterSites (e2e)', () => {
  let app: INestApplication;
  let genericClusterSiteRepository: Repository<GenericClusterSite>;
  let userRepository: Repository<User>;
  let authToken: string;
  let testUserId: string;

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    genericClusterSiteRepository = moduleFixture.get<Repository<GenericClusterSite>>(
      getRepositoryToken(GenericClusterSite),
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    // Create test user and get auth token
    const hashedPassword = await bcrypt.hash('testpass123', 12);
    const testUser = userRepository.create({
      username: 'testuser',
      password: hashedPassword,
      email: 'test@example.com',
      twoFactorEnabled: false,
    });
    const savedUser = await userRepository.save(testUser);
    testUserId = savedUser.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup
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
      // Create a test site first
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

