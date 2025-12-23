import { PartialType } from '@nestjs/swagger';
import { CreateGenericClusterSiteDto } from './create-generic-cluster-site.dto';

export class UpdateGenericClusterSiteDto extends PartialType(
  CreateGenericClusterSiteDto,
) {}
