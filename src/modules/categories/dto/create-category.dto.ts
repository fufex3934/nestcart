import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsMongoId,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Electronics and gadgets', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '60d5f9f9b8e5e72d4c5e4f4e', required: false })
  @IsMongoId()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(999)
  @Type(() => Number)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
