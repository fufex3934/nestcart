/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Expose, Transform } from 'class-transformer';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductVisibility } from '../enums/product-visibility.enum';
export class ProductResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  sku: string;

  @Expose()
  barcode?: string;

  @Expose()
  price: number;

  @Expose()
  compareAtPrice?: number;

  @Expose()
  quantity: number;

  @Expose()
  lowStockThreshold: number;

  @Expose()
  description?: string;

  @Expose()
  images: string[];

  @Expose()
  thumbnail?: string;

  @Expose()
  @Transform(({ obj }) => obj.categoryId?.toString())
  categoryId: string;

  @Expose()
  @Transform(({ obj }) => ({
    id: obj.categoryId?._id?.toString(),
    name: obj.categoryId?.name,
    slug: obj.categoryId?.slug,
  }))
  category?: any;

  @Expose()
  tags: string[];

  @Expose()
  attributes?: Record<string, any>;

  @Expose()
  shipping?: any;

  @Expose()
  status: ProductStatus;

  @Expose()
  visibility: ProductVisibility;

  @Expose()
  viewCount: number;

  @Expose()
  soldCount: number;

  @Expose()
  rating?: number;

  @Expose()
  reviewCount: number;

  @Expose()
  availableFrom?: Date;

  @Expose()
  availableTo?: Date;

  @Expose()
  @Transform(({ obj }) => obj.relatedProducts?.map((p) => p.toString()))
  relatedProducts?: string[];

  @Expose()
  metadata?: Record<string, any>;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  inStock: boolean;

  @Expose()
  isLowStock: boolean;
}
