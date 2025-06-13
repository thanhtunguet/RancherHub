import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AppInstancesService } from './app-instances.service';
import { CreateAppInstanceDto } from './dto/create-app-instance.dto';
import { UpdateAppInstanceDto } from './dto/update-app-instance.dto';

@ApiTags('app-instances')
@Controller('api/app-instances')
export class AppInstancesController {
  constructor(private readonly appInstancesService: AppInstancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new app instance' })
  @ApiResponse({ status: 201, description: 'App instance created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateAppInstanceDto })
  create(@Body() createAppInstanceDto: CreateAppInstanceDto) {
    return this.appInstancesService.create(createAppInstanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all app instances' })
  @ApiResponse({ status: 200, description: 'List of app instances' })
  @ApiQuery({
    name: 'env',
    required: false,
    description: 'Filter by environment ID',
  })
  findAll(@Query('env') environmentId?: string) {
    return this.appInstancesService.findAll(environmentId);
  }

  @Get('by-environment/:environmentId')
  @ApiOperation({ summary: 'Get app instances for a specific environment' })
  @ApiResponse({ status: 200, description: 'App instances for environment' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  findByEnvironment(@Param('environmentId') environmentId: string) {
    return this.appInstancesService.findByEnvironment(environmentId);
  }

  @Get('by-site/:siteId')
  @ApiOperation({ summary: 'Get app instances for a specific site' })
  @ApiResponse({ status: 200, description: 'App instances for site' })
  @ApiParam({ name: 'siteId', description: 'Site ID' })
  findBySite(@Param('siteId') siteId: string) {
    return this.appInstancesService.findBySite(siteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific app instance by ID' })
  @ApiResponse({ status: 200, description: 'App instance details' })
  @ApiResponse({ status: 404, description: 'App instance not found' })
  @ApiParam({ name: 'id', description: 'App instance ID' })
  findOne(@Param('id') id: string) {
    return this.appInstancesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an app instance' })
  @ApiResponse({ status: 200, description: 'App instance updated successfully' })
  @ApiResponse({ status: 404, description: 'App instance not found' })
  @ApiParam({ name: 'id', description: 'App instance ID' })
  @ApiBody({ type: UpdateAppInstanceDto })
  update(
    @Param('id') id: string,
    @Body() updateAppInstanceDto: UpdateAppInstanceDto,
  ) {
    return this.appInstancesService.update(id, updateAppInstanceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an app instance' })
  @ApiResponse({ status: 204, description: 'App instance deleted successfully' })
  @ApiResponse({ status: 404, description: 'App instance not found' })
  @ApiParam({ name: 'id', description: 'App instance ID' })
  remove(@Param('id') id: string) {
    return this.appInstancesService.remove(id);
  }
}