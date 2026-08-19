import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { PurchaseService } from './purchase.service';
import { PurchaseUploadService } from './purchase-upload.service';
import type {
  MaterialCategory,
  ManualPurchaseResponse,
  ParsedPurchaseItem,
  PriceHistoryByCatalogResponse,
  UploadListResponse,
  UploadParseResponse,
} from '@shared/types';

@Controller('api/purchase')
export class PurchaseController {
  constructor(
    private readonly purchaseService: PurchaseService,
    private readonly purchaseUploadService: PurchaseUploadService,
  ) {}

  @Get('price-history')
  async getPriceHistoryByCatalog(
    @Query('catalogNo') catalogNo: string,
  ): Promise<PriceHistoryByCatalogResponse> {
    if (!catalogNo) {
      throw new BadRequestException('货号不能为空');
    }
    return this.purchaseService.getPriceHistoryByCatalog(catalogNo);
  }

  @Post('manual')
  async manualAdd(
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
  ): Promise<ManualPurchaseResponse> {
    if (!body.name || !body.catalogNo || !body.category || !body.purchaseDate) {
      throw new BadRequestException('名称、类别、货号、采购日期为必填项');
    }
    return this.purchaseService.manualAdd({
      name: body.name,
      category: body.category,
      catalogNo: body.catalogNo,
      specification: body.specification || '',
      supplier: body.supplier || '',
      unitPrice: Number(body.unitPrice),
      stock: body.stock ?? 0,
      purchaseDate: body.purchaseDate,
      remark: body.remark || '',
    });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadAndParse(
    @UploadedFile() file: { buffer: Buffer; originalname: string; size: number },
    @Req() req: Request,
  ): Promise<UploadParseResponse> {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    // 从 body 读取 LLM 配置（可选）
    const body = req.body as Record<string, string>;
    let apiBaseUrl = body.apiBaseUrl || '';
    let apiKey = body.apiKey || '';
    let modelName = body.modelName || '';

    // 如果请求中没有提供，从全局配置取
    if (!apiBaseUrl || !apiKey || !modelName) {
      const globalCfg = await this.purchaseUploadService.getGlobalLLMConfig();
      if (!apiBaseUrl) apiBaseUrl = globalCfg.apiBaseUrl;
      if (!apiKey) apiKey = globalCfg.apiKey;
      if (!modelName) modelName = globalCfg.modelName;
    }

    return this.purchaseUploadService.parseUpload(file.buffer, file.originalname, {
      apiBaseUrl,
      apiKey,
      modelName,
    });
  }

  @Post('upload/:id/confirm')
  async confirmUpload(
    @Param('id') id: string,
    @Body() body: { items: ParsedPurchaseItem[] },
  ): Promise<{ success: boolean; insertedCount: number }> {
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('请提供确认入库的条目');
    }
    return this.purchaseUploadService.confirmUpload(id, body.items);
  }

  @Get('uploads')
  async getUploadList(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ): Promise<UploadListResponse> {
    return this.purchaseUploadService.getUploadList(
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10)),
    );
  }
}
