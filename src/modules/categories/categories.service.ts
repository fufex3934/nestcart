/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    userId: string,
  ): Promise<CategoryDocument> {
    // Check if category with same name exists
    const existingCategory = await this.categoryModel.findOne({
      name: createCategoryDto.name,
      deletedAt: null,
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    // If parentId is provided, verify it exists
    if (createCategoryDto.parentId) {
      const parent = await this.categoryModel.findOne({
        _id: createCategoryDto.parentId,
        deletedAt: null,
      });

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    // Calculate level based on parent
    let level = 0;
    if (createCategoryDto.parentId) {
      const parent = await this.categoryModel.findById(
        createCategoryDto.parentId,
      );
      if (parent) {
        // Fix: Add null check
        level = parent.level + 1;
      }
    }

    const category = new this.categoryModel({
      ...createCategoryDto,
      level,
      createdBy: userId,
      updatedBy: userId,
    });

    return category.save();
  }

  async findAll(query: QueryCategoryDto) {
    const { includeInactive, parentId, search, tree } = query;

    // Build filter
    const filter: any = { deletedAt: null };

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (parentId !== undefined) {
      filter.parentId = parentId === 'null' ? null : parentId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // If tree is requested, return hierarchical structure
    if (tree) {
      const categories = await this.categoryModel
        .find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .lean()
        .exec();

      return this.buildCategoryTree(categories);
    }

    // Otherwise return flat list
    return this.categoryModel
      .find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<CategoryDocument> {
    const category = await this.findOne(id);

    // If name is being updated, check for duplicates
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryModel.findOne({
        name: updateCategoryDto.name,
        deletedAt: null,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    // If parentId is being updated
    if (updateCategoryDto.parentId !== undefined) {
      // Prevent circular reference
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      if (updateCategoryDto.parentId) {
        const parent = await this.categoryModel.findOne({
          _id: updateCategoryDto.parentId,
          deletedAt: null,
        });

        if (!parent) {
          throw new BadRequestException('Parent category not found');
        }

        // Update level based on new parent
        updateCategoryDto['level'] = parent.level + 1;
      } else {
        updateCategoryDto['level'] = 0;
      }
    }

    Object.assign(category, updateCategoryDto, {
      updatedBy: userId,
    });

    return category.save();
  }

  async remove(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const category = await this.findOne(id);

    // Check if category has children
    const hasChildren = await this.categoryModel.exists({
      parentId: id,
      deletedAt: null,
    });

    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    }

    // Check if category has products
    const productModel = this.categoryModel.db.model('Product');
    const hasProducts = await productModel.exists({
      categoryId: id,
      deletedAt: null,
    });

    if (hasProducts) {
      throw new BadRequestException(
        'Cannot delete category with associated products',
      );
    }

    // Soft delete
    await this.categoryModel.updateOne({ _id: id }, { deletedAt: new Date() });
  }

  async getCategoryPath(id: string): Promise<CategoryDocument[]> {
    const path: CategoryDocument[] = [];
    let currentId: Types.ObjectId | null = new Types.ObjectId(id);

    while (currentId) {
      const category = await this.categoryModel.findById(currentId);
      if (!category) break;

      path.unshift(category);
      currentId = category.parentId as Types.ObjectId | null;
    }

    return path;
  }

  private buildCategoryTree(
    categories: any[],
    parentId: string | null = null,
  ): any[] {
    const tree: any[] = []; // Fix: Add type annotation for 'never' error

    for (const category of categories) {
      if (
        category.parentId?.toString() === parentId?.toString() ||
        (category.parentId === null && parentId === null)
      ) {
        const children = this.buildCategoryTree(
          categories,
          category._id.toString(),
        );
        if (children.length > 0) {
          category.children = children;
        }

        tree.push(category);
      }
    }

    return tree;
  }

  async findActiveCategories(): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ isActive: true, deletedAt: null })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }
}
