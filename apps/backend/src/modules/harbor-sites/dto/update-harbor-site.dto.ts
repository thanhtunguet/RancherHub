import { PartialType } from '@nestjs/swagger';
import { CreateHarborSiteDto } from './create-harbor-site.dto';

export class UpdateHarborSiteDto extends PartialType(CreateHarborSiteDto) {}
