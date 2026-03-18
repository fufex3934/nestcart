/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Expose, Transform } from 'class-transformer';

export class CategoryResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description?: string;

  @Expose()
  @Transform(({ obj }) => obj.parentId?.toString() || null)
  parentId?: string;

  @Expose()
  level: number;

  @Expose()
  isActive: boolean;

  @Expose()
  image?: string;

  @Expose()
  sortOrder: number;

  @Expose()
  metadata?: Record<string, any>;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Transform(({ obj }) => obj._doc?.path || null)
  path?: string;
}

export class CategoryTreeResponseDto extends CategoryResponseDto {
  @Expose()
  children?: CategoryTreeResponseDto[];
}
