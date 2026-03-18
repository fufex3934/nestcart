import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (
      doc: HydratedDocument<Category>,
      ret: Partial<Category> & { _id?: any; __v?: number },
    ) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Category {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ required: true, trim: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  parentId?: Types.ObjectId;

  @Prop({ default: 0 })
  level: number; // for nested categories (0=root)

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  image?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentId: 1, isActive: 1 });
CategorySchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
CategorySchema.pre('save', function (this: CategoryDocument) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});
