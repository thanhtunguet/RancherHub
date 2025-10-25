import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as speakeasy from 'speakeasy';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserResponseDto, UserListResponseDto, UserStatsDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Verify admin's 2FA token
   */
  private async verifyAdminToken(adminId: string, token: string): Promise<void> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new UnauthorizedException('Admin user not found');
    }

    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled for your account. Please enable 2FA first.');
    }

    const isValid = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token. Please enter the correct code from your authenticator app.');
    }
  }

  /**
   * Create a new user (requires admin 2FA)
   */
  async create(createUserDto: CreateUserDto, adminId: string): Promise<UserResponseDto> {
    // Verify admin's 2FA token
    await this.verifyAdminToken(adminId, createUserDto.adminTwoFactorToken);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email }
      ],
    });

    if (existingUser) {
      throw new BadRequestException('User with this username or email already exists');
    }

    // Create new user
    const user = this.userRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      password: createUserDto.password,
      isFirstLogin: true,
      active: true,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, twoFactorSecret, ...result } = savedUser;
    return result;
  }

  /**
   * Get all users with pagination and filtering
   */
  async findAll(query: QueryUserDto): Promise<UserListResponseDto> {
    const { search, active, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply search filter
    if (search) {
      queryBuilder.where(
        'user.username LIKE :search OR user.email LIKE :search',
        { search: `%${search}%` }
      );
    }

    // Apply active filter
    if (active !== undefined) {
      queryBuilder.andWhere('user.active = :active', { active });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and get results
    const users = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    // Remove sensitive data
    const data = users.map(user => {
      const { password, twoFactorSecret, ...result } = user;
      return result;
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single user by ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, twoFactorSecret, ...result } = user;
    return result;
  }

  /**
   * Update a user (requires admin 2FA)
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    adminId: string
  ): Promise<UserResponseDto> {
    // Verify admin's 2FA token
    await this.verifyAdminToken(adminId, updateUserDto.adminTwoFactorToken);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for duplicate username/email if being updated
    if (updateUserDto.username || updateUserDto.email) {
      const duplicateUser = await this.userRepository.findOne({
        where: [
          { username: updateUserDto.username },
          { email: updateUserDto.email }
        ],
      });

      if (duplicateUser && duplicateUser.id !== id) {
        throw new BadRequestException('Username or email already exists');
      }
    }

    // Update fields
    if (updateUserDto.username) user.username = updateUserDto.username;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.password) user.password = updateUserDto.password;
    if (updateUserDto.active !== undefined) user.active = updateUserDto.active;

    const savedUser = await this.userRepository.save(user);
    const { password, twoFactorSecret, ...result } = savedUser;
    return result;
  }

  /**
   * Delete a user (requires admin 2FA)
   */
  async remove(id: string, token: string, adminId: string): Promise<void> {
    // Verify admin's 2FA token
    await this.verifyAdminToken(adminId, token);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deleting themselves
    if (user.id === adminId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.userRepository.remove(user);
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStatsDto> {
    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { active: true } });
    const inactive = await this.userRepository.count({ where: { active: false } });
    const with2FA = await this.userRepository.count({ where: { twoFactorEnabled: true } });

    return { total, active, inactive, with2FA };
  }
}
