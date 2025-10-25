import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthSeederService {
  private readonly logger = new Logger(AuthSeederService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createDefaultAdmin() {
    try {
      const adminCount = await this.userRepository.count();
      
      if (adminCount === 0) {
        const defaultAdmin = this.userRepository.create({
          username: 'admin',
          email: 'admin@rancherhub.local',
          password: 'admin123', // Will be hashed automatically
          active: true,
          isFirstLogin: true,
        });

        await this.userRepository.save(defaultAdmin);
        this.logger.log('Default admin user created: admin / admin123');
        this.logger.warn('Please change the default password after first login!');
      } else {
        this.logger.log('Admin users already exist, skipping seeder');
      }
    } catch (error) {
      this.logger.error('Failed to create default admin user:', error);
    }
  }
}