import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplate } from '../../entities/message-template.entity';
import { MessageTemplatesService } from './message-templates.service';
import { MessageTemplatesController } from './message-templates.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([MessageTemplate]), AuthModule],
  controllers: [MessageTemplatesController],
  providers: [MessageTemplatesService],
  exports: [MessageTemplatesService],
})
export class MessageTemplatesModule {}
