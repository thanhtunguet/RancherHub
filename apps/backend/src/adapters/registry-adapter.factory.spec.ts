import { RegistryAdapterFactory } from './registry-adapter.factory';
import { HarborRegistryAdapter } from './harbor-registry.adapter';
import { DockerHubRegistryAdapter } from './dockerhub-registry.adapter';

describe('RegistryAdapterFactory', () => {
  const makeDeps = () => {
    const harborSitesService = {
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    const harborApiService = {} as any;
    const dockerHubApiService = {} as any;

    const factory = new RegistryAdapterFactory(
      harborSitesService as any,
      harborApiService,
      dockerHubApiService,
    );

    return {
      factory,
      harborSitesService,
      harborApiService,
      dockerHubApiService,
    };
  };

  const harborSite = {
    id: 'hs-1',
    name: 'harbor-main',
    url: 'https://harbor.example.com',
    username: 'admin',
    password: 'secret',
    active: true,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates Harbor adapter by site ID', async () => {
    const { factory, harborSitesService } = makeDeps();

    harborSitesService.findOne.mockResolvedValue(harborSite);

    const adapter = await factory.createHarborAdapter(harborSite.id);

    expect(harborSitesService.findOne).toHaveBeenCalledWith(harborSite.id);
    expect(adapter).toBeInstanceOf(HarborRegistryAdapter);
  });

  it('creates DockerHub adapter directly', () => {
    const { factory } = makeDeps();

    const adapter = factory.createDockerHubAdapter();

    expect(adapter).toBeInstanceOf(DockerHubRegistryAdapter);
  });

  it('routes short image refs to DockerHub adapter', async () => {
    const { factory } = makeDeps();

    const adapter = await factory.createAdapterFromImageRef('nginx:latest');

    expect(adapter).toBeInstanceOf(DockerHubRegistryAdapter);
  });

  it('routes to Harbor adapter when host matches Harbor site', async () => {
    const { factory, harborSitesService } = makeDeps();

    harborSitesService.findAll.mockResolvedValue([harborSite]);

    const adapter = await factory.createAdapterFromImageRef(
      'harbor.example.com/project/api:v1',
    );

    expect(harborSitesService.findAll).toHaveBeenCalled();
    expect(adapter).toBeInstanceOf(HarborRegistryAdapter);
  });

  it('normalizes Harbor site URL and matches host:port image refs', async () => {
    const { factory, harborSitesService } = makeDeps();

    harborSitesService.findAll.mockResolvedValue([
      { ...harborSite, url: 'https://harbor.example.com:8443/' },
    ]);

    const adapter = await factory.createAdapterFromImageRef(
      'harbor.example.com:8443/team/app:v2',
    );

    expect(adapter).toBeInstanceOf(HarborRegistryAdapter);
  });

  it('falls back to DockerHub when host does not match any Harbor site', async () => {
    const { factory, harborSitesService } = makeDeps();

    harborSitesService.findAll.mockResolvedValue([
      { ...harborSite, url: 'https://harbor-internal.example.com' },
    ]);

    const adapter = await factory.createAdapterFromImageRef(
      'ghcr.io/org/repo:v1',
    );

    expect(adapter).toBeInstanceOf(DockerHubRegistryAdapter);
  });

  it('requires registry domain and project before trying Harbor lookup', async () => {
    const { factory, harborSitesService } = makeDeps();

    const adapter = await factory.createAdapterFromImageRef('library/nginx:1.27');

    expect(harborSitesService.findAll).not.toHaveBeenCalled();
    expect(adapter).toBeInstanceOf(DockerHubRegistryAdapter);
  });

  it('handles digest references and still matches Harbor', async () => {
    const { factory, harborSitesService } = makeDeps();

    harborSitesService.findAll.mockResolvedValue([harborSite]);

    const adapter = await factory.createAdapterFromImageRef(
      'harbor.example.com/team/api@sha256:abcdef',
    );

    expect(adapter).toBeInstanceOf(HarborRegistryAdapter);
  });

  it('uses DockerHub when image ref host cannot be parsed', async () => {
    const { factory } = makeDeps();

    const adapter = await factory.createAdapterFromImageRef('////:bad');

    expect(adapter).toBeInstanceOf(DockerHubRegistryAdapter);
  });
});
