import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Require2FAGuard } from '../auth/guards/require-2fa.guard';

@ApiTags('Users')
@Controller('api/users')
@UseGuards(JwtAuthGuard, Require2FAGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (requires admin 2FA token)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user exists or invalid 2FA token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid 2FA token' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user (requires admin 2FA token)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - duplicate username/email or invalid 2FA token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid 2FA token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(id, updateUserDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (requires admin 2FA token)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot delete own account or invalid 2FA token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid 2FA token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id') id: string,
    @Body() deleteUserDto: DeleteUserDto,
    @Request() req,
  ) {
    await this.usersService.remove(
      id,
      deleteUserDto.adminTwoFactorToken,
      req.user.userId,
    );
    return { success: true, message: 'User deleted successfully' };
  }
}
