import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { User } from '../users/schemas/user.schema';

@Controller('products')
@UseGuards(JwtGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.create(createProductDto, user.id);
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('featured')
  async getFeatured() {
    return this.productsService.getFeaturedProducts();
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Public()
  @Get('category/:categoryId')
  async getByCategory(
    @Param('categoryId', ParseMongoIdPipe) categoryId: string,
    @Query() query: QueryProductDto,
  ) {
    return this.productsService.getProductsByCategory(categoryId, query);
  }

  @Public()
  @Get(':id/related')
  async getRelated(@Param('id', ParseMongoIdPipe) id: string) {
    return this.productsService.getRelatedProducts(id);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.update(id, updateProductDto, user.id);
  }

  @Patch(':id/stock')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  async updateStock(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() body: { quantity: number; operation: 'add' | 'subtract' },
  ) {
    return this.productsService.updateStock(id, body.quantity, body.operation);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseMongoIdPipe) id: string) {
    await this.productsService.remove(id);
  }
}
