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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { HarborSitesService } from './harbor-sites.service';
import { CreateHarborSiteDto } from './dto/create-harbor-site.dto';
import { UpdateHarborSiteDto } from './dto/update-harbor-site.dto';
import { TestHarborConnectionDto } from './dto/test-harbor-connection.dto';

@ApiTags('harbor-sites')
@Controller('api/harbor-sites')
export class HarborSitesController {
  constructor(private readonly harborSitesService: HarborSitesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Harbor site' })
  @ApiResponse({ status: 201, description: 'Harbor site created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateHarborSiteDto })
  create(@Body() createHarborSiteDto: CreateHarborSiteDto) {
    return this.harborSitesService.create(createHarborSiteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Harbor sites' })
  @ApiResponse({ status: 200, description: 'List of all Harbor sites' })
  findAll() {
    return this.harborSitesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active Harbor site' })
  @ApiResponse({ status: 200, description: 'Active Harbor site details' })
  @ApiResponse({ status: 404, description: 'No active Harbor site found' })
  getActiveSite() {
    return this.harborSitesService.getActiveSite();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Harbor site by ID' })
  @ApiResponse({ status: 200, description: 'Harbor site details' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  findOne(@Param('id') id: string) {
    return this.harborSitesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Harbor site' })
  @ApiResponse({ status: 200, description: 'Harbor site updated successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  @ApiBody({ type: UpdateHarborSiteDto })
  update(@Param('id') id: string, @Body() updateHarborSiteDto: UpdateHarborSiteDto) {
    return this.harborSitesService.update(id, updateHarborSiteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Harbor site' })
  @ApiResponse({ status: 204, description: 'Harbor site deleted successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  remove(@Param('id') id: string) {
    return this.harborSitesService.remove(id);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test connection to a Harbor registry' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @ApiBody({ type: TestHarborConnectionDto })
  testConnection(@Body() testConnectionDto: TestHarborConnectionDto) {
    return this.harborSitesService.testConnection(testConnectionDto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Set a Harbor site as active' })
  @ApiResponse({ status: 200, description: 'Harbor site activated successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  activateSite(@Param('id') id: string) {
    return this.harborSitesService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a Harbor site' })
  @ApiResponse({ status: 200, description: 'Harbor site deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  deactivateSite(@Param('id') id: string) {
    return this.harborSitesService.setActive(id, false);
  }
}