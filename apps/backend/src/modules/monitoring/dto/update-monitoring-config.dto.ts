import { PartialType } from '@nestjs/swagger';
import { CreateMonitoringConfigDto } from './create-monitoring-config.dto';

export class UpdateMonitoringConfigDto extends PartialType(
  CreateMonitoringConfigDto,
) {}
