import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RancherSite } from '../../entities/rancher-site.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { TestConnectionResponseDto } from './dto/test-connection.dto';
import { RancherApiService } from '../../services/rancher-api.service';
import axios from 'axios';

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(RancherSite)
    private sitesRepository: Repository<RancherSite>,
    private rancherApiService: RancherApiService,
  ) {}

  async create(createSiteDto: CreateSiteDto): Promise<RancherSite> {
    const site = this.sitesRepository.create(createSiteDto);
    return await this.sitesRepository.save(site);
  }

  async findAll(): Promise<RancherSite[]> {
    return await this.sitesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<RancherSite> {
    const site = await this.sitesRepository.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found`);
    }
    return site;
  }

  async update(id: string, updateSiteDto: UpdateSiteDto): Promise<RancherSite> {
    const site = await this.findOne(id);
    Object.assign(site, updateSiteDto);
    return await this.sitesRepository.save(site);
  }

  async remove(id: string): Promise<void> {
    const site = await this.findOne(id);
    await this.sitesRepository.remove(site);
  }

  async testConnection(id: string): Promise<TestConnectionResponseDto> {
    const site = await this.findOne(id);
    
    try {
      const response = await axios.get(`${site.url}/v3`, {
        headers: {
          Authorization: `Bearer ${site.token}`,
        },
        timeout: 10000,
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'Connection successful',
          data: {
            rancherVersion: response.data?.rancherVersion || 'Unknown',
            serverVersion: response.data?.serverVersion || 'Unknown',
          },
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      let message = 'Connection failed';
      if (error.code === 'ECONNREFUSED') {
        message = 'Connection refused - server may be down';
      } else if (error.code === 'ENOTFOUND') {
        message = 'Server not found - check URL';
      } else if (error.response?.status === 401) {
        message = 'Authentication failed - check token';
      } else if (error.response?.status === 403) {
        message = 'Access forbidden - insufficient permissions';
      } else if (error.message) {
        message = error.message;
      }

      return {
        success: false,
        message,
      };
    }
  }

  async setActive(id: string, active: boolean): Promise<RancherSite> {
    const site = await this.findOne(id);
    
    if (active) {
      await this.sitesRepository.update({ active: true }, { active: false });
    }
    
    site.active = active;
    return await this.sitesRepository.save(site);
  }

  async getActiveSite(): Promise<RancherSite | null> {
    return await this.sitesRepository.findOne({ where: { active: true } });
  }

  async getClusters(siteId: string) {
    const site = await this.findOne(siteId);
    return await this.rancherApiService.getClusters(site);
  }

  async getNamespaces(siteId: string, clusterId?: string) {
    const site = await this.findOne(siteId);
    return await this.rancherApiService.getNamespaces(site, clusterId);
  }
}