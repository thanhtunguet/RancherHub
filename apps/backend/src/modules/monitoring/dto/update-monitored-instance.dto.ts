import { PartialType } from '@nestjs/swagger';
import { CreateMonitoredInstanceDto } from './create-monitored-instance.dto';

export class UpdateMonitoredInstanceDto extends PartialType(CreateMonitoredInstanceDto) {}