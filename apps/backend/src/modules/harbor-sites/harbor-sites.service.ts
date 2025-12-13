import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarborSite } from '../../entities/harbor-site.entity';
import { CreateHarborSiteDto } from './dto/create-harbor-site.dto';
import { UpdateHarborSiteDto } from './dto/update-harbor-site.dto';
import { TestHarborConnectionDto } from './dto/test-harbor-connection.dto';
import axios from 'axios';

@Injectable()
export class HarborSitesService {
  private readonly logger = new Logger(HarborSitesService.name);

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

  async update(
    id: string,
    updateHarborSiteDto: UpdateHarborSiteDto,
  ): Promise<HarborSite> {
    const site = await this.findOne(id);
    Object.assign(site, updateHarborSiteDto);
    return await this.harborSitesRepository.save(site);
  }

  async remove(id: string): Promise<void> {
    const site = await this.findOne(id);
    await this.harborSitesRepository.remove(site);
  }

  async testConnection(
    testConnectionDto: TestHarborConnectionDto,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const credentials = `${testConnectionDto.username}:${testConnectionDto.password}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');
      const basicAuth = base64Credentials;

      // Log authorization header in development mode only
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Harbor Test Connection Debug] Username: ${testConnectionDto.username}`,
        );
        console.log(
          `[Harbor Test Connection Debug] Credentials (username:password): ${credentials}`,
        );
        console.log(
          `[Harbor Test Connection Debug] Base64 encoded: ${base64Credentials}`,
        );
        console.log(
          `[Harbor Test Connection Debug] Full Authorization header: Basic ${basicAuth}`,
        );
      }

      // Normalize the URL by removing trailing slashes
      let baseUrl = testConnectionDto.url.replace(/\/+$/, '');

      this.logger.log(`[Harbor Test Connection] Starting connection test`);
      this.logger.log(
        `[Harbor Test Connection] Original URL: ${testConnectionDto.url}`,
      );
      this.logger.log(
        `[Harbor Test Connection] User: ${testConnectionDto.username}`,
      );

      // Check if the URL already contains /api/v2.0 or /api/v2
      // If not, append /api/v2.0
      if (!baseUrl.includes('/api/v2')) {
        baseUrl = `${baseUrl}/api/v2.0`;
        this.logger.log(`[Harbor Test Connection] Appended /api/v2.0 to URL`);
      }

      this.logger.log(`[Harbor Test Connection] Final base URL: ${baseUrl}`);

      // Use /users/current endpoint to verify both Harbor server and authentication
      // This endpoint requires Basic auth and returns current user info if successful
      const currentUserUrl = `${baseUrl}/users/current`;
      this.logger.log(
        `[Harbor Test Connection] Calling: GET ${currentUserUrl}`,
      );
      this.logger.log(
        `[Harbor Test Connection] Headers: Authorization=Basic (user: ${testConnectionDto.username}), Content-Type=application/json`,
      );

      const authHeaderValue = `Basic ${basicAuth}`;

      // Log full request details in development
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Harbor Test Connection Debug] Full request URL: ${currentUserUrl}`,
        );
        console.log(`[Harbor Test Connection Debug] Request method: GET`);
        console.log(
          `[Harbor Test Connection Debug] Full Authorization header value: ${authHeaderValue}`,
        );
        console.log(
          `[Harbor Test Connection Debug] Request headers: ${JSON.stringify({
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          })}`,
        );
      }

      const userResponse = await axios.get(currentUserUrl, {
        headers: {
          Authorization: authHeaderValue,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      // Log response details in development
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Harbor Test Connection Debug] Response status: ${userResponse.status} ${userResponse.statusText}`,
        );
        console.log(
          `[Harbor Test Connection Debug] Response headers: ${JSON.stringify(userResponse.headers)}`,
        );
      }

      this.logger.log(
        `[Harbor Test Connection] ✅ Response status: ${userResponse.status} ${userResponse.statusText}`,
      );
      this.logger.log(
        `[Harbor Test Connection] Response data: ${JSON.stringify(userResponse.data)}`,
      );

      if (userResponse.status === 200) {
        // Authentication successful, get user info and also fetch projects count
        const userInfo = userResponse.data;
        let projectCount = 0;

        try {
          // Optionally get projects count to provide more info
          const projectsUrl = `${baseUrl}/projects`;
          this.logger.log(
            `[Harbor Test Connection] Fetching projects: GET ${projectsUrl}`,
          );

          // Log full authorization header in development
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[Harbor Test Connection Debug] Projects API - Full Authorization header value: Basic ${basicAuth}`,
            );
          }

          const projectsResponse = await axios.get(projectsUrl, {
            headers: {
              Authorization: `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          });

          this.logger.log(
            `[Harbor Test Connection] Projects response status: ${projectsResponse.status}`,
          );

          if (projectsResponse.status === 200) {
            projectCount = Array.isArray(projectsResponse.data)
              ? projectsResponse.data.length
              : 0;
            this.logger.log(
              `[Harbor Test Connection] Found ${projectCount} projects`,
            );
          }
        } catch (projectsError: any) {
          // Ignore projects error, we already verified auth with /users/current
          // This is just for additional info
          this.logger.warn(
            `[Harbor Test Connection] ⚠️ Failed to fetch projects (non-critical): ${projectsError.message}`,
          );
        }

        return {
          success: true,
          message: `Connection successful - Authenticated as ${userInfo.username || 'user'}`,
          data: {
            user: {
              username: userInfo.username,
              email: userInfo.email,
              realname: userInfo.realname,
              admin: userInfo.sysadmin_flag || false,
            },
            projectCount,
            harborUrl: testConnectionDto.url,
          },
        };
      } else {
        throw new Error(`HTTP ${userResponse.status}`);
      }
    } catch (error: any) {
      this.logger.error(`[Harbor Test Connection] ❌ Connection test failed`);
      this.logger.error(
        `[Harbor Test Connection] Error code: ${error.code || 'N/A'}`,
      );
      this.logger.error(
        `[Harbor Test Connection] Error message: ${error.message}`,
      );
      if (error.response) {
        this.logger.error(
          `[Harbor Test Connection] Response status: ${error.response.status} ${error.response.statusText}`,
        );
        this.logger.error(
          `[Harbor Test Connection] Response data: ${JSON.stringify(error.response.data)}`,
        );
        this.logger.error(
          `[Harbor Test Connection] Request URL: ${error.config?.url || 'unknown'}`,
        );
      } else if (error.config) {
        this.logger.error(
          `[Harbor Test Connection] Request URL: ${error.config.url || 'unknown'}`,
        );
      }

      let message = 'Connection failed';
      if (error.code === 'ECONNREFUSED') {
        message = 'Connection refused - Harbor server may be down';
      } else if (error.code === 'ENOTFOUND') {
        message = 'Server not found - check Harbor URL';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        message = 'Connection timeout - Harbor server may be unreachable';
      } else if (error.response?.status === 401) {
        message = 'Authentication failed - check Harbor username and password';
      } else if (error.response?.status === 403) {
        message =
          'Access forbidden - user may not have permission to access Harbor';
      } else if (error.response?.status === 404) {
        message =
          'Harbor API not found - verify the Harbor URL (e.g., http://harbor.example.com without /api/v2.0)';
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
      await this.harborSitesRepository.update(
        { active: true },
        { active: false },
      );
    }

    site.active = active;
    return await this.harborSitesRepository.save(site);
  }

  async getActiveSite(): Promise<HarborSite | null> {
    return await this.harborSitesRepository.findOne({
      where: { active: true },
    });
  }
}
