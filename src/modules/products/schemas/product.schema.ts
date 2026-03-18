import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductVisibility } from '../enums/product-visibility.enum';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (
      doc: HydratedDocument<Product>,
      ret: Partial<Product> & { _id?: any; __v?: number },
    ) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ required: true, trim: true })
  sku: string; // Stock Keeping Unit

  @Prop({ trim: true })
  barcode?: string; // UPC or EAN

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0, default: 0 })
  compareAtPrice?: number; // Original price for sales

  @Prop({ min: 0, default: 0 })
  cost: number; // Cost price for profit calculation

  @Prop({ min: 0, default: 0 })
  quantity: number; // Available stock quantity

  @Prop({ default: 0 })
  lowStockThreshold: number; // Alert when quantity falls below this

  @Prop()
  description?: string;

  @Prop({ type: Object })
  shortDescription?: Record<string, any>; // For rich text or structured content

  @Prop({ type: [String], default: [] })
  images?: string[]; // Array of image URLs

  @Prop()
  thumnail?: string; // Main image URL

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  vendorId?: Types.ObjectId; // If multiple vendors

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  attributes?: Record<string, any>; // For custom attributes like color, size, etc.

  @Prop({ type: Object })
  shipping?: {
    weight: number;
    weightUnit: 'g' | 'kg' | 'lb' | 'oz';
    dimensions: {
      length: number;
      width: number;
      height: number;
      unit: 'cm' | 'in';
    };
    freeShipping: boolean;
  };

  @Prop({ type: Object })
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };

  @Prop({ enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Prop({ enum: ProductVisibility, default: ProductVisibility.PUBLIC })
  visibility: ProductVisibility;

  @Prop({ type: Date })
  availableFrom?: Date;

  @Prop({ type: Date })
  availableTo?: Date;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  soldCount: number;

  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }] })
  relatedProducts?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }] })
  crossSellProducts?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }] })
  upSellProducts?: Types.ObjectId[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes for search and filtering
ProductSchema.index({ slug: 1 });
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ categoryId: 1, status: 1, visibility: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ 'attributes.key': 1, 'attributes.value': 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ soldCount: -1 });
ProductSchema.index({ rating: -1 });

// Text search indexes
ProductSchema.index(
  {
    name: 'text',
    description: 'text',
    sku: 'text',
    'attributes.value': 'text',
  },
  {
    weights: {
      name: 10,
      sku: 8,
      description: 5,
      'attributes.value': 3,
    },
    name: 'product_search',
  },
);

// Pre-save middleware to generate slug
ProductSchema.pre('save', function (this: ProductDocument) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

// Pre-save middleware to ensure SKU is uppercase
ProductSchema.pre('save', function (this: ProductDocument) {
  if (this.isModified('sku')) {
    this.sku = this.sku.toUpperCase();
  }
});
