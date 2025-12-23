/* eslint-disable @typescript-eslint/no-var-requires */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GenericClusterSitesService } from './generic-cluster-sites.service';
import { GenericClusterSite } from '../../entities/generic-cluster-site.entity';
import { CreateGenericClusterSiteDto } from './dto/create-generic-cluster-site.dto';
import { UpdateGenericClusterSiteDto } from './dto/update-generic-cluster-site.dto';

describe('GenericClusterSitesService', () => {
  let service: GenericClusterSitesService;
  let repository: jest.Mocked<Repository<GenericClusterSite>>;

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

  const mockSite: GenericClusterSite = {
    id: 'site-1',
    name: 'Test Cluster',
    kubeconfig: validKubeconfig,
    clusterName: 'test-cluster',
    serverUrl: 'https://test-cluster.example.com',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as GenericClusterSite;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericClusterSitesService,
        {
          provide: getRepositoryToken(GenericClusterSite),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<GenericClusterSitesService>(
      GenericClusterSitesService,
    );
    repository = module.get(getRepositoryToken(GenericClusterSite));
  });

  describe('create', () => {
    it('should create a new generic cluster site', async () => {
      const createDto: CreateGenericClusterSiteDto = {
        name: 'Test Cluster',
        kubeconfig: validKubeconfig,
      };

      repository.create.mockReturnValue(mockSite);
      repository.save.mockResolvedValue(mockSite);

      // Mock KubeConfig to avoid actual connection
      jest
        .spyOn(require('@kubernetes/client-node'), 'KubeConfig')
        .mockImplementation(() => ({
          loadFromString: jest.fn(),
          makeApiClient: jest.fn().mockReturnValue({
            listNamespace: jest.fn().mockResolvedValue({ items: [] }),
          }),
        }));

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSite);
    });

    it('should throw BadRequestException for invalid kubeconfig', async () => {
      const createDto: CreateGenericClusterSiteDto = {
        name: 'Test Cluster',
        kubeconfig: 'invalid-yaml',
      };

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing current-context', async () => {
      const invalidKubeconfig = `
apiVersion: v1
kind: Config
clusters: []
contexts: []
users: []
`;

      const createDto: CreateGenericClusterSiteDto = {
        name: 'Test Cluster',
        kubeconfig: invalidKubeconfig,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all generic cluster sites', async () => {
      const sites = [mockSite];
      repository.find.mockResolvedValue(sites);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(sites);
    });
  });

  describe('findOne', () => {
    it('should return a generic cluster site by id', async () => {
      repository.findOne.mockResolvedValue(mockSite);

      const result = await service.findOne('site-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'site-1' },
      });
      expect(result).toEqual(mockSite);
    });

    it('should throw NotFoundException if site not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a generic cluster site', async () => {
      const updateDto: UpdateGenericClusterSiteDto = {
        name: 'Updated Cluster',
      };

      repository.findOne.mockResolvedValue(mockSite);
      repository.save.mockResolvedValue({ ...mockSite, ...updateDto });

      const result = await service.update('site-1', updateDto);

      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Cluster');
    });

    it('should validate kubeconfig when updating', async () => {
      const updateDto: UpdateGenericClusterSiteDto = {
        kubeconfig: validKubeconfig,
      };

      repository.findOne.mockResolvedValue(mockSite);

      // Mock KubeConfig
      jest
        .spyOn(require('@kubernetes/client-node'), 'KubeConfig')
        .mockImplementation(() => ({
          loadFromString: jest.fn(),
          makeApiClient: jest.fn().mockReturnValue({
            listNamespace: jest.fn().mockResolvedValue({ items: [] }),
          }),
        }));

      repository.save.mockResolvedValue({ ...mockSite, ...updateDto });

      await service.update('site-1', updateDto);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a generic cluster site', async () => {
      repository.findOne.mockResolvedValue(mockSite);
      repository.remove.mockResolvedValue(mockSite);

      await service.remove('site-1');

      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.remove).toHaveBeenCalledWith(mockSite);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      repository.findOne.mockResolvedValue(mockSite);

      // Mock successful connection
      jest
        .spyOn(require('@kubernetes/client-node'), 'KubeConfig')
        .mockImplementation(() => ({
          loadFromString: jest.fn(),
          makeApiClient: jest.fn().mockReturnValue({
            listNamespace: jest.fn().mockResolvedValue({ items: [] }),
          }),
        }));

      const result = await service.testConnection('site-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    it('should return failure on connection error', async () => {
      repository.findOne.mockResolvedValue(mockSite);

      // Mock connection failure
      jest
        .spyOn(require('@kubernetes/client-node'), 'KubeConfig')
        .mockImplementation(() => ({
          loadFromString: jest.fn(),
          makeApiClient: jest.fn().mockReturnValue({
            listNamespace: jest
              .fn()
              .mockRejectedValue(new Error('Connection failed')),
          }),
        }));

      const result = await service.testConnection('site-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('setActive', () => {
    it('should set site as active and deactivate others', async () => {
      repository.findOne.mockResolvedValue(mockSite);
      repository.update.mockResolvedValue({ affected: 1 } as any);
      repository.save.mockResolvedValue({ ...mockSite, active: true });

      const result = await service.setActive('site-1', true);

      expect(repository.update).toHaveBeenCalledWith(
        { active: true },
        { active: false },
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result.active).toBe(true);
    });

    it('should deactivate site without affecting others', async () => {
      repository.findOne.mockResolvedValue(mockSite);
      repository.save.mockResolvedValue({ ...mockSite, active: false });

      const result = await service.setActive('site-1', false);

      expect(repository.update).not.toHaveBeenCalled();
      expect(result.active).toBe(false);
    });
  });

  describe('getNamespaces', () => {
    it('should return namespaces from cluster', async () => {
      repository.findOne.mockResolvedValue(mockSite);

      const mockNamespaces = [
        {
          metadata: {
            name: 'default',
            uid: 'uid-1',
            creationTimestamp: '2024-01-01T00:00:00Z',
          },
          status: { phase: 'Active' },
        },
      ];

      jest
        .spyOn(require('@kubernetes/client-node'), 'KubeConfig')
        .mockImplementation(() => ({
          loadFromString: jest.fn(),
          makeApiClient: jest.fn().mockReturnValue({
            listNamespace: jest
              .fn()
              .mockResolvedValue({ items: mockNamespaces }),
          }),
        }));

      const result = await service.getNamespaces('site-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('default');
    });

    it('should throw BadRequestException on error', async () => {
      repository.findOne.mockResolvedValue(mockSite);

      jest
        .spyOn(require('@kubernetes/client-node'), 'KubeConfig')
        .mockImplementation(() => ({
          loadFromString: jest.fn(),
          makeApiClient: jest.fn().mockReturnValue({
            listNamespace: jest.fn().mockRejectedValue(new Error('API Error')),
          }),
        }));

      await expect(service.getNamespaces('site-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
