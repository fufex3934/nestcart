import { IsOptional, IsBoolean, IsMongoId, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryCategoryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeInactive?: boolean;

  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  tree?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
