import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Environment } from '../../entities/environment.entity';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(Environment)
    private environmentsRepository: Repository<Environment>,
  ) {}

  async create(createEnvironmentDto: CreateEnvironmentDto): Promise<Environment> {
    const environment = this.environmentsRepository.create(createEnvironmentDto);
    return await this.environmentsRepository.save(environment);
  }

  async findAll(): Promise<Environment[]> {
    return await this.environmentsRepository.find({
      order: { createdAt: 'ASC' },
      relations: ['appInstances'],
    });
  }

  async findOne(id: string): Promise<Environment> {
    const environment = await this.environmentsRepository.findOne({
      where: { id },
      relations: ['appInstances', 'appInstances.rancherSite'],
    });
    
    if (!environment) {
      throw new NotFoundException(`Environment with ID ${id} not found`);
    }
    
    return environment;
  }

  async update(id: string, updateEnvironmentDto: UpdateEnvironmentDto): Promise<Environment> {
    const environment = await this.findOne(id);
    Object.assign(environment, updateEnvironmentDto);
    return await this.environmentsRepository.save(environment);
  }

  async remove(id: string): Promise<void> {
    const environment = await this.findOne(id);
    await this.environmentsRepository.remove(environment);
  }

  async findWithAppInstances(id: string): Promise<Environment> {
    const environment = await this.environmentsRepository.findOne({
      where: { id },
      relations: [
        'appInstances',
        'appInstances.rancherSite',
        'appInstances.services',
      ],
    });

    if (!environment) {
      throw new NotFoundException(`Environment with ID ${id} not found`);
    }

    return environment;
  }
}