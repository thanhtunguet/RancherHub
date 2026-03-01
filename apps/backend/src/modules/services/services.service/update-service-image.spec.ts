import { BadRequestException, NotFoundException } from '@nestjs/common';
import { updateServiceImage } from './update-service-image';

describe('updateServiceImage', () => {
  const makeServiceDeps = () => {
    const serviceRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const appInstanceRepository = {
      findOne: jest.fn(),
    };

    const clusterAdapterFactory = {
      createAdapter: jest.fn(),
    };

    const logger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    const servicesService = {
      serviceRepository,
      appInstanceRepository,
      clusterAdapterFactory,
      logger,
    } as any;

    return {
      servicesService,
      serviceRepository,
      appInstanceRepository,
      clusterAdapterFactory,
    };
  };

  const appInstance = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'my-app',
    cluster: 'c-1',
    namespace: 'ns-1',
    rancherSite: { id: 'rs-1' },
    genericClusterSite: null,
  };

  it('updates image for UUID-backed service and persists database state', async () => {
    const { servicesService, serviceRepository, clusterAdapterFactory } =
      makeServiceDeps();

    const serviceEntity = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'api',
      imageTag: 'repo/api:v1',
      workloadType: 'deployment',
      appInstance,
      status: 'active',
    };

    serviceRepository.findOne.mockResolvedValue(serviceEntity);
    serviceRepository.save.mockResolvedValue(serviceEntity);

    const adapter = {
      updateWorkloadImage: jest.fn().mockResolvedValue({ ok: true }),
    };
    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    const result = await updateServiceImage(
      servicesService,
      serviceEntity.id,
      'v2',
    );

    expect(adapter.updateWorkloadImage).toHaveBeenCalledWith(
      'c-1',
      'ns-1',
      'api',
      'deployment',
      'repo/api:v2',
    );
    expect(serviceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ imageTag: 'repo/api:v2', status: 'updating' }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        service: expect.objectContaining({
          oldImageTag: 'v1',
          newImageTag: 'v2',
          fullNewImageTag: 'repo/api:v2',
        }),
      }),
    );
  });

  it('supports composite service IDs and skips DB save when service is synthetic', async () => {
    const {
      servicesService,
      serviceRepository,
      appInstanceRepository,
      clusterAdapterFactory,
    } = makeServiceDeps();

    const compositeId = `${appInstance.id}-api-service`;

    serviceRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    appInstanceRepository.findOne.mockResolvedValue(appInstance);

    clusterAdapterFactory.createAdapter
      .mockResolvedValueOnce({
        getDeployments: jest.fn().mockResolvedValue([
          {
            name: 'api-service',
            state: 'active',
            scale: 1,
            availableReplicas: 1,
            image: 'repo/api-service:v1',
            type: 'deployment',
          },
        ]),
      })
      .mockResolvedValueOnce({
        updateWorkloadImage: jest.fn().mockResolvedValue({ ok: true }),
      });

    const result = await updateServiceImage(servicesService, compositeId, 'v9');

    expect(serviceRepository.save).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.service.fullNewImageTag).toBe('repo/api-service:v9');
  });

  it('throws NotFoundException when service cannot be found', async () => {
    const { servicesService, serviceRepository } = makeServiceDeps();

    serviceRepository.findOne.mockResolvedValue(null);

    await expect(
      updateServiceImage(servicesService, 'missing-id', 'v2'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when service has no appInstance', async () => {
    const { servicesService, serviceRepository } = makeServiceDeps();

    serviceRepository.findOne.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'api',
      imageTag: 'repo/api:v1',
      workloadType: 'deployment',
      appInstance: null,
    });

    await expect(
      updateServiceImage(
        servicesService,
        '22222222-2222-4222-8222-222222222222',
        'v2',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when appInstance lacks cluster site', async () => {
    const { servicesService, serviceRepository } = makeServiceDeps();

    serviceRepository.findOne.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'api',
      imageTag: 'repo/api:v1',
      workloadType: 'deployment',
      appInstance: {
        ...appInstance,
        rancherSite: null,
        genericClusterSite: null,
      },
    });

    await expect(
      updateServiceImage(
        servicesService,
        '22222222-2222-4222-8222-222222222222',
        'v2',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when service has no imageTag', async () => {
    const { servicesService, serviceRepository } = makeServiceDeps();

    serviceRepository.findOne.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'api',
      imageTag: '',
      workloadType: 'deployment',
      appInstance,
    });

    await expect(
      updateServiceImage(
        servicesService,
        '22222222-2222-4222-8222-222222222222',
        'v2',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('wraps adapter errors in BadRequestException', async () => {
    const { servicesService, serviceRepository, clusterAdapterFactory } =
      makeServiceDeps();

    const serviceEntity = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'api',
      imageTag: 'repo/api:v1',
      workloadType: 'deployment',
      appInstance,
    };

    serviceRepository.findOne.mockResolvedValue(serviceEntity);
    clusterAdapterFactory.createAdapter.mockResolvedValue({
      updateWorkloadImage: jest.fn().mockRejectedValue(new Error('api-failed')),
    });

    await expect(
      updateServiceImage(servicesService, serviceEntity.id, 'v2'),
    ).rejects.toThrow('Failed to update deployment image: api-failed');
  });
});
