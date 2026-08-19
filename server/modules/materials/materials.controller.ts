import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import type {
  MaterialListResponse,
  Material,
  MaterialStatistics,
  PriceHistoryResponse,
  MaterialCategory,
} from '@shared/types';

@Controller('api/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async getList(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<MaterialListResponse> {
    return this.materialsService.getList({
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      category,
      keyword,
      sortBy,
      sortOrder,
    });
  }

  @Get('statistics')
  async getStatistics(): Promise<MaterialStatistics> {
    return this.materialsService.getStatistics();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Material> {
    return this.materialsService.getById(id);
  }

  @Get(':id/price-history')
  async getPriceHistory(@Param('id') id: string): Promise<PriceHistoryResponse> {
    return this.materialsService.getPriceHistory(id);
  }

  @Post()
  async create(
    @Body() body: {
      name: string;
      category: MaterialCategory;
      catalogNo: string;
      specification?: string;
      supplier?: string;
      unitPrice: number;
      stock?: number;
      purchaseDate: string;
      remark?: string;
    },
  ): Promise<Material> {
    if (!body.name || !body.category || !body.catalogNo) {
      throw new BadRequestException('名称、类别、货号为必填项');
    }
    return this.materialsService.create({
      name: body.name,
      category: body.category,
      catalogNo: body.catalogNo,
      specification: body.specification || '',
      supplier: body.supplier || '',
      unitPrice: body.unitPrice,
      stock: body.stock ?? 0,
      purchaseDate: body.purchaseDate,
      remark: body.remark || '',
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      category: MaterialCategory;
      catalogNo: string;
      specification: string;
      supplier: string;
      unitPrice: number;
      stock: number;
      purchaseDate: string;
      remark: string;
    }>,
  ): Promise<Material> {
    return this.materialsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.materialsService.delete(id);
  }
}
