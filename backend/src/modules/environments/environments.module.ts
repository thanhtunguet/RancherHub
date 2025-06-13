import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment } from '../../entities/environment.entity';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Environment])],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}