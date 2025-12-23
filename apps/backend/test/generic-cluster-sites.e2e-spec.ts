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

  describe('/generic-cluster-sites (POST)', () => {
    it('should create a generic cluster site', () => {
      return request(app.getHttpServer())
        .post('/generic-cluster-sites')
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
        .post('/generic-cluster-sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Cluster',
          kubeconfig: 'invalid-yaml',
        })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/generic-cluster-sites')
        .send({
          name: 'Test Cluster',
          kubeconfig: validKubeconfig,
        })
        .expect(401);
    });
  });

  describe('/generic-cluster-sites (GET)', () => {
    it('should return all generic cluster sites', async () => {
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
        .get('/generic-cluster-sites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/generic-cluster-sites/:id (GET)', () => {
    it('should return a specific generic cluster site', async () => {
      const site = genericClusterSiteRepository.create({
        name: 'Get Test Cluster',
        kubeconfig: validKubeconfig,
        clusterName: 'test-cluster',
        serverUrl: 'https://test-cluster.example.com',
        active: true,
      });
      const savedSite = await genericClusterSiteRepository.save(site);

      return request(app.getHttpServer())
        .get(`/generic-cluster-sites/${savedSite.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(savedSite.id);
          expect(res.body.name).toBe('Get Test Cluster');
        });
    });

    it('should return 404 for non-existent site', () => {
      return request(app.getHttpServer())
        .get('/generic-cluster-sites/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/generic-cluster-sites/:id (PUT)', () => {
    it('should update a generic cluster site', async () => {
      const site = genericClusterSiteRepository.create({
        name: 'Update Test Cluster',
        kubeconfig: validKubeconfig,
        clusterName: 'test-cluster',
        serverUrl: 'https://test-cluster.example.com',
        active: true,
      });
      const savedSite = await genericClusterSiteRepository.save(site);

      return request(app.getHttpServer())
        .put(`/generic-cluster-sites/${savedSite.id}`)
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

  describe('/generic-cluster-sites/:id/test (POST)', () => {
    it('should test connection to a generic cluster site', async () => {
      const site = genericClusterSiteRepository.create({
        name: 'Test Connection Cluster',
        kubeconfig: validKubeconfig,
        clusterName: 'test-cluster',
        serverUrl: 'https://test-cluster.example.com',
        active: true,
      });
      const savedSite = await genericClusterSiteRepository.save(site);

      return request(app.getHttpServer())
        .post(`/generic-cluster-sites/${savedSite.id}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('/generic-cluster-sites/:id/set-active (POST)', () => {
    it('should set a site as active', async () => {
      const site1 = genericClusterSiteRepository.create({
        name: 'Active Site 1',
        kubeconfig: validKubeconfig,
        clusterName: 'test-cluster',
        serverUrl: 'https://test-cluster.example.com',
        active: false,
      });
      const savedSite1 = await genericClusterSiteRepository.save(site1);

      return request(app.getHttpServer())
        .post(`/generic-cluster-sites/${savedSite1.id}/set-active`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ active: true })
        .expect(200)
        .expect((res) => {
          expect(res.body.active).toBe(true);
        });
    });
  });

  describe('/generic-cluster-sites/:id/namespaces (GET)', () => {
    it('should get namespaces from a generic cluster site', async () => {
      const site = genericClusterSiteRepository.create({
        name: 'Namespaces Test Cluster',
        kubeconfig: validKubeconfig,
        clusterName: 'test-cluster',
        serverUrl: 'https://test-cluster.example.com',
        active: true,
      });
      const savedSite = await genericClusterSiteRepository.save(site);

      return request(app.getHttpServer())
        .get(`/generic-cluster-sites/${savedSite.id}/namespaces`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/generic-cluster-sites/:id (DELETE)', () => {
    it('should delete a generic cluster site', async () => {
      const site = genericClusterSiteRepository.create({
        name: 'Delete Test Cluster',
        kubeconfig: validKubeconfig,
        clusterName: 'test-cluster',
        serverUrl: 'https://test-cluster.example.com',
        active: true,
      });
      const savedSite = await genericClusterSiteRepository.save(site);

      return request(app.getHttpServer())
        .delete(`/generic-cluster-sites/${savedSite.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});

