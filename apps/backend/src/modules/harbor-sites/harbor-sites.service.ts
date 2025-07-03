import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarborSite } from '../../entities/harbor-site.entity';
import { CreateHarborSiteDto } from './dto/create-harbor-site.dto';
import { UpdateHarborSiteDto } from './dto/update-harbor-site.dto';
import { TestHarborConnectionDto } from './dto/test-harbor-connection.dto';
import axios from 'axios';

@Injectable()
export class HarborSitesService {
  constructor(
    @InjectRepository(HarborSite)
    private harborSitesRepository: Repository<HarborSite>,
  ) {}

  async create(createHarborSiteDto: CreateHarborSiteDto): Promise<HarborSite> {
    const site = this.harborSitesRepository.create(createHarborSiteDto);
    return await this.harborSitesRepository.save(site);
  }

  async findAll(): Promise<HarborSite[]> {
    return await this.harborSitesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<HarborSite> {
    const site = await this.harborSitesRepository.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException(`Harbor site with ID ${id} not found`);
    }
    return site;
  }

  async update(id: string, updateHarborSiteDto: UpdateHarborSiteDto): Promise<HarborSite> {
    const site = await this.findOne(id);
    Object.assign(site, updateHarborSiteDto);
    return await this.harborSitesRepository.save(site);
  }

  async remove(id: string): Promise<void> {
    const site = await this.findOne(id);
    await this.harborSitesRepository.remove(site);
  }

  async testConnection(testConnectionDto: TestHarborConnectionDto): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const basicAuth = Buffer.from(`${testConnectionDto.username}:${testConnectionDto.password}`).toString('base64');
      
      const response = await axios.get(`${testConnectionDto.url}/api/v2.0/systeminfo`, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
        timeout: 10000,
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'Connection successful',
          data: {
            harborVersion: response.data?.harbor_version || 'Unknown',
            registryUrl: response.data?.registry_url || testConnectionDto.url,
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
        message = 'Authentication failed - check credentials';
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

  async setActive(id: string, active: boolean): Promise<HarborSite> {
    const site = await this.findOne(id);
    
    if (active) {
      await this.harborSitesRepository.update({ active: true }, { active: false });
    }
    
    site.active = active;
    return await this.harborSitesRepository.save(site);
  }

  async getActiveSite(): Promise<HarborSite | null> {
    return await this.harborSitesRepository.findOne({ where: { active: true } });
  }
}