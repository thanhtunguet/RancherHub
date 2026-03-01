import { NotFoundException } from '@nestjs/common';
import { ClusterAdapterFactory } from './cluster-adapter.factory';
import { RancherClusterAdapter } from './rancher-cluster.adapter';
import { GenericClusterAdapter } from './generic-cluster.adapter';

describe('ClusterAdapterFactory', () => {
  const makeDeps = () => {
    const rancherSiteRepository = {
      findOne: jest.fn(),
    };

    const genericClusterSiteRepository = {
      findOne: jest.fn(),
    };

    const rancherApiService = {} as any;

    const factory = new ClusterAdapterFactory(
      rancherSiteRepository as any,
      genericClusterSiteRepository as any,
      rancherApiService,
    );

    return {
      factory,
      rancherSiteRepository,
      genericClusterSiteRepository,
      rancherApiService,
    };
  };

  const rancherSite = {
    id: 'rs-1',
    name: 'rancher-main',
    url: 'https://rancher.example.com',
    token: 'token',
  };

  const genericSite = {
    id: 'gs-1',
    name: 'generic-main',
    kubeconfig: 'apiVersion: v1\nkind: Config\nclusters: []\ncontexts: []\nusers: []\n',
    clusterName: 'generic-cluster',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates rancher adapter when appInstance clusterType is rancher with loaded site', async () => {
    const { factory } = makeDeps();

    const appInstance = {
      id: 'app-1',
      clusterType: 'rancher',
      rancherSite,
      rancherSiteId: rancherSite.id,
    } as any;

    const adapter = await factory.createAdapter(appInstance);

    expect(adapter).toBeInstanceOf(RancherClusterAdapter);
  });

  it('loads rancher site and creates adapter when relation is missing', async () => {
    const { factory, rancherSiteRepository } = makeDeps();

    rancherSiteRepository.findOne.mockResolvedValue(rancherSite);

    const appInstance = {
      id: 'app-1',
      clusterType: 'rancher',
      rancherSite: null,
      rancherSiteId: rancherSite.id,
    } as any;

    const adapter = await factory.createAdapter(appInstance);

    expect(rancherSiteRepository.findOne).toHaveBeenCalledWith({
      where: { id: rancherSite.id },
    });
    expect(adapter).toBeInstanceOf(RancherClusterAdapter);
  });

  it('throws NotFoundException when rancher site cannot be loaded', async () => {
    const { factory, rancherSiteRepository } = makeDeps();

    rancherSiteRepository.findOne.mockResolvedValue(null);

    const appInstance = {
      id: 'app-404',
      clusterType: 'rancher',
      rancherSite: null,
      rancherSiteId: 'missing',
    } as any;

    await expect(factory.createAdapter(appInstance)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates generic adapter when appInstance clusterType is generic with loaded site', async () => {
    const { factory } = makeDeps();

    const appInstance = {
      id: 'app-2',
      clusterType: 'generic',
      genericClusterSite: genericSite,
      genericClusterSiteId: genericSite.id,
    } as any;

    const adapter = await factory.createAdapter(appInstance);

    expect(adapter).toBeInstanceOf(GenericClusterAdapter);
  });

  it('loads generic site and creates adapter when relation is missing', async () => {
    const { factory, genericClusterSiteRepository } = makeDeps();

    genericClusterSiteRepository.findOne.mockResolvedValue(genericSite);

    const appInstance = {
      id: 'app-2',
      clusterType: 'generic',
      genericClusterSite: null,
      genericClusterSiteId: genericSite.id,
    } as any;

    const adapter = await factory.createAdapter(appInstance);

    expect(genericClusterSiteRepository.findOne).toHaveBeenCalledWith({
      where: { id: genericSite.id },
    });
    expect(adapter).toBeInstanceOf(GenericClusterAdapter);
  });

  it('throws NotFoundException when generic site cannot be loaded', async () => {
    const { factory, genericClusterSiteRepository } = makeDeps();

    genericClusterSiteRepository.findOne.mockResolvedValue(null);

    const appInstance = {
      id: 'app-g404',
      clusterType: 'generic',
      genericClusterSite: null,
      genericClusterSiteId: 'missing',
    } as any;

    await expect(factory.createAdapter(appInstance)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws for unknown cluster type', async () => {
    const { factory } = makeDeps();

    await expect(
      factory.createAdapter({ clusterType: 'unknown' } as any),
    ).rejects.toThrow('Unknown cluster type: unknown');
  });

  it('creates adapter from rancher site id', async () => {
    const { factory, rancherSiteRepository } = makeDeps();

    rancherSiteRepository.findOne.mockResolvedValue(rancherSite);

    const adapter = await factory.createAdapterFromSite('rancher', rancherSite.id);

    expect(adapter).toBeInstanceOf(RancherClusterAdapter);
  });

  it('creates adapter from generic site id', async () => {
    const { factory, genericClusterSiteRepository } = makeDeps();

    genericClusterSiteRepository.findOne.mockResolvedValue(genericSite);

    const adapter = await factory.createAdapterFromSite('generic', genericSite.id);

    expect(adapter).toBeInstanceOf(GenericClusterAdapter);
  });

  it('throws when creating adapter from missing rancher site', async () => {
    const { factory, rancherSiteRepository } = makeDeps();

    rancherSiteRepository.findOne.mockResolvedValue(null);

    await expect(
      factory.createAdapterFromSite('rancher', 'missing'),
    ).rejects.toThrow('Rancher site not found');
  });

  it('throws when creating adapter from missing generic site', async () => {
    const { factory, genericClusterSiteRepository } = makeDeps();

    genericClusterSiteRepository.findOne.mockResolvedValue(null);

    await expect(
      factory.createAdapterFromSite('generic', 'missing'),
    ).rejects.toThrow('Generic cluster site not found');
  });
});
