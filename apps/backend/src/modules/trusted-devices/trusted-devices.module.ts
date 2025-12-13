import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustedDevicesController } from './trusted-devices.controller';
import { TrustedDevicesService } from './trusted-devices.service';
import { TrustedDevice } from '../../entities/trusted-device.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrustedDevice, User])],
  controllers: [TrustedDevicesController],
  providers: [TrustedDevicesService],
  exports: [TrustedDevicesService],
})
export class TrustedDevicesModule {}
