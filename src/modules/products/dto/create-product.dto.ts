import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  IsMongoId,
  IsEnum,
  IsObject,
  IsDateString,
  ValidateNested,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductVisibility } from '../enums/product-visibility.enum';
import { PartialType } from '@nestjs/mapped-types';

class ShippingDto {
  @IsNumber()
  @Min(0)
  weight: number;

  @IsEnum(['g', 'kg', 'lb', 'oz'])
  weightUnit: 'g' | 'kg' | 'lb' | 'oz';

  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions: DimensionsDto;

  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;
}

class DimensionsDto {
  @IsNumber()
  @Min(0)
  length: number;

  @IsNumber()
  @Min(0)
  width: number;

  @IsNumber()
  @Min(0)
  height: number;

  @IsEnum(['cm', 'in'])
  unit: 'cm' | 'in';
}

class SeoDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 13 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'IPH13PRO-BLK-128' })
  @IsString()
  sku: string;

  @ApiProperty({ example: '123456789012', required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 1199.99, required: false })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  compareAtPrice?: number;

  @ApiProperty({ example: 750.0, required: false })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  cost?: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  lowStockThreshold?: number;

  @ApiProperty({
    example: 'The latest iPhone with pro camera system',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: '60d5f9f9b8e5e72d4c5e4f4e' })
  @IsMongoId()
  categoryId: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => ShippingDto)
  @IsOptional()
  shipping?: ShippingDto;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => SeoDto)
  @IsOptional()
  seo?: SeoDto;

  @ApiProperty({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiProperty({ enum: ProductVisibility, default: ProductVisibility.PUBLIC })
  @IsEnum(ProductVisibility)
  @IsOptional()
  visibility?: ProductVisibility;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  availableFrom?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  availableTo?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  relatedProducts?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  crossSellProducts?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  upSellProducts?: string[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
