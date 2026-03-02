import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RancherSite } from '../../entities/rancher-site.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { TestConnectionResponseDto } from './dto/test-connection.dto';
import { RancherApiService } from '../../services/rancher-api.service';
import { parseSafeBaseUrl } from '../../common/validators/safe-url.validator';

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(RancherSite)
    private sitesRepository: Repository<RancherSite>,
    private rancherApiService: RancherApiService,
  ) {}

  async create(createSiteDto: CreateSiteDto): Promise<RancherSite> {
    // Normalise URL to origin-only (strips path/query/fragment) as a defence
    // against SSRF via crafted paths embedded in the URL field.
    const safeUrl = parseSafeBaseUrl(createSiteDto.url).toString();
    const site = this.sitesRepository.create({ ...createSiteDto, url: safeUrl });
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
    if (updateSiteDto.url) {
      updateSiteDto.url = parseSafeBaseUrl(updateSiteDto.url).toString();
    }
    Object.assign(site, updateSiteDto);
    const saved = await this.sitesRepository.save(site);
    // Evict the cached Axios client so the next call rebuilds it against the
    // newly-validated URL. Without this, an attacker who updates a site URL
    // could leave a stale client pointing at the old (possibly malicious) host.
    this.rancherApiService.clearClient(id);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const site = await this.findOne(id);
    await this.sitesRepository.remove(site);
  }

  async testConnection(id: string): Promise<TestConnectionResponseDto> {
    const site = await this.findOne(id);
    // Delegate to RancherApiService so all outbound HTTP goes through a single
    // audited path that uses the validated/normalised site.url.
    return this.rancherApiService.testConnection(site);
  }

  async setActive(id: string, active: boolean): Promise<RancherSite> {
    const site = await this.findOne(id);
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
