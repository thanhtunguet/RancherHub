import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Require2FAGuard } from '../auth/guards/require-2fa.guard';

@ApiTags('environments')
@Controller('api/environments')
@UseGuards(JwtAuthGuard, Require2FAGuard)
@ApiBearerAuth()
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new environment' })
  @ApiResponse({ status: 201, description: 'Environment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateEnvironmentDto })
  create(@Body() createEnvironmentDto: CreateEnvironmentDto) {
    return this.environmentsService.create(createEnvironmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all environments' })
  @ApiResponse({ status: 200, description: 'List of all environments' })
  findAll() {
    return this.environmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific environment by ID' })
  @ApiResponse({ status: 200, description: 'Environment details' })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  findOne(@Param('id') id: string) {
    return this.environmentsService.findOne(id);
  }

  @Get(':id/with-instances')
  @ApiOperation({ summary: 'Get environment with app instances and services' })
  @ApiResponse({ status: 200, description: 'Environment with app instances' })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  findWithAppInstances(@Param('id') id: string) {
    return this.environmentsService.findWithAppInstances(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an environment' })
  @ApiResponse({ status: 200, description: 'Environment updated successfully' })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  @ApiBody({ type: UpdateEnvironmentDto })
  update(@Param('id') id: string, @Body() updateEnvironmentDto: UpdateEnvironmentDto) {
    return this.environmentsService.update(id, updateEnvironmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an environment' })
  @ApiResponse({ status: 204, description: 'Environment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Environment not found' })
  @ApiParam({ name: 'id', description: 'Environment ID' })
  remove(@Param('id') id: string) {
    return this.environmentsService.remove(id);
  }
}