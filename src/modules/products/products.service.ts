/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, SortOrder } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { ProductStatus } from './enums/product-status.enum';
import { ProductVisibility } from './enums/product-visibility.enum';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private categoriesService: CategoriesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    userId: string,
  ): Promise<ProductDocument> {
    // Check if product with same SKU exists
    const existingProduct = await this.productModel.findOne({
      sku: createProductDto.sku.toUpperCase(),
      deletedAt: null,
    });

    if (existingProduct) {
      throw new ConflictException('Product with this SKU already exists');
    }

    // Verify category exists
    await this.categoriesService.findOne(createProductDto.categoryId);

    // Generate slug from name
    const slug = this.generateSlug(createProductDto.name);

    // Check if slug exists and make it unique if needed
    const slugExists = await this.productModel.findOne({
      slug,
      deletedAt: null,
    });

    let finalSlug = slug;
    if (slugExists) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const product = new this.productModel({
      ...createProductDto,
      sku: createProductDto.sku.toUpperCase(),
      slug: finalSlug,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return product.save();
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      status,
      visibility,
      minPrice,
      maxPrice,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock,
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { deletedAt: null };

    if (status) filter.status = status;
    if (visibility) filter.visibility = visibility;
    if (categoryId) filter.categoryId = new Types.ObjectId(categoryId);

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    // Tags
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    // Stock status
    if (inStock !== undefined) {
      filter.quantity = inStock ? { $gt: 0 } : { $lte: 0 };
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort
    const sort: Record<string, SortOrder> = {};
    if (search) {
      // If searching, sort by text score first
      sort.score = { $meta: 'textScore' } as any;
    }
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    let queryBuilder = this.productModel
      .find(filter)
      .populate('categoryId', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // If searching, include text score
    if (search) {
      queryBuilder = queryBuilder.select({
        score: { $meta: 'textScore' },
      }) as any;
    }

    const [products, total] = await Promise.all([
      queryBuilder.exec(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        ...(search && { searchTerm: search }),
      },
    };
  }

  async findOne(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel
      .findOne({
        _id: id,
        deletedAt: null,
      })
      .populate('categoryId', 'name slug path')
      .populate('relatedProducts', 'name slug price images')
      .populate('crossSellProducts', 'name slug price images')
      .populate('upSellProducts', 'name slug price images')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    await this.productModel.updateOne({ _id: id }, { $inc: { viewCount: 1 } });

    return product;
  }

  async findBySlug(slug: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({
        slug,
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        visibility: ProductVisibility.PUBLIC,
      })
      .populate('categoryId', 'name slug path')
      .populate('relatedProducts', 'name slug price images')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    await this.productModel.updateOne(
      { _id: product._id },
      { $inc: { viewCount: 1 } },
    );

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
  ): Promise<ProductDocument> {
    const product = await this.findOne(id);

    // If SKU is being updated, check for duplicates
    if (
      updateProductDto.sku &&
      updateProductDto.sku.toUpperCase() !== product.sku
    ) {
      const existingProduct = await this.productModel.findOne({
        sku: updateProductDto.sku.toUpperCase(),
        deletedAt: null,
        _id: { $ne: id },
      });

      if (existingProduct) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    // If name is being updated, update slug
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const newSlug = this.generateSlug(updateProductDto.name);

      // Check if new slug exists
      const slugExists = await this.productModel.findOne({
        slug: newSlug,
        deletedAt: null,
        _id: { $ne: id },
      });

      if (slugExists) {
        product.slug = `${newSlug}-${Date.now()}`;
      } else {
        product.slug = newSlug;
      }
    }

    // If category is being updated, verify it exists
    if (updateProductDto.categoryId) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    // Update product properties
    Object.assign(product, updateProductDto);
    product.updatedBy = new Types.ObjectId(userId);

    if (updateProductDto.sku) {
      product.sku = updateProductDto.sku.toUpperCase();
    }

    return product.save();
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Verify product exists

    // Soft delete
    await this.productModel.updateOne({ _id: id }, { deletedAt: new Date() });
  }

  async updateStock(
    id: string,
    quantity: number,
    operation: 'add' | 'subtract' = 'add',
  ): Promise<ProductDocument> {
    const product = await this.findOne(id);

    const updateOperation =
      operation === 'add'
        ? { $inc: { quantity } }
        : { $inc: { quantity: -quantity } };

    if (operation === 'subtract' && product.quantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const updated = await this.productModel.findByIdAndUpdate(
      id,
      updateOperation,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Product not found after update');
    }

    // If product becomes out of stock, update status
    if (updated.quantity <= 0 && updated.status === ProductStatus.ACTIVE) {
      updated.status = ProductStatus.OUT_OF_STOCK;
      await updated.save();
    }

    return updated;
  }

  async getRelatedProducts(
    id: string,
    limit: number = 10,
  ): Promise<ProductDocument[]> {
    const product = await this.findOne(id);

    // Find products with same category or tags
    const related = await this.productModel
      .find({
        _id: { $ne: id },
        categoryId: product.categoryId,
        status: ProductStatus.ACTIVE,
        visibility: ProductVisibility.PUBLIC,
        deletedAt: null,
      })
      .limit(limit)
      .exec();

    return related;
  }

  async getFeaturedProducts(limit: number = 10): Promise<ProductDocument[]> {
    return this.productModel
      .find({
        status: ProductStatus.ACTIVE,
        visibility: ProductVisibility.PUBLIC,
        deletedAt: null,
      })
      .sort({ soldCount: -1, rating: -1, viewCount: -1 })
      .limit(limit)
      .exec();
  }

  async getProductsByCategory(categoryId: string, query: QueryProductDto) {
    return this.findAll({
      ...query,
      categoryId,
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async validateStock(
    items: { productId: string; quantity: number }[],
  ): Promise<boolean> {
    for (const item of items) {
      const product = await this.productModel.findById(item.productId);

      if (!product || product.quantity < item.quantity) {
        return false;
      }
    }
    return true;
  }

  async bulkUpdateStock(
    items: { productId: string; quantity: number }[],
  ): Promise<void> {
    const operations = items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId, quantity: { $gte: item.quantity } },
        update: {
          $inc: { quantity: -item.quantity, soldCount: item.quantity },
        },
      },
    }));

    const result = await this.productModel.bulkWrite(operations);

    if (result.modifiedCount !== items.length) {
      throw new BadRequestException('Failed to update stock for some products');
    }
  }
}
