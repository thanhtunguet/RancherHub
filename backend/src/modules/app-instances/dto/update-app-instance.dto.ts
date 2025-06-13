import { PartialType } from '@nestjs/swagger';
import { CreateAppInstanceDto } from './create-app-instance.dto';

export class UpdateAppInstanceDto extends PartialType(CreateAppInstanceDto) {}