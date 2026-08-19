import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  Logger,
} from '@nestjs/common';
import { ResearchService } from './research.service';
import type {
  ResearchGenerateResponse,
  ResearchPlanListResponse,
} from '@shared/types';

interface GenerateBody {
  direction: string;
  apiBaseUrl?: string;
  apiKey?: string;
  modelName?: string;
}

interface SavePlanBody {
  title: string;
  direction: string;
  content: Record<string, unknown>;
  reagentsUsed: Record<string, unknown>[];
  estimatedSavings: number;
}

@Controller('api/research')
export class ResearchController {
  private readonly logger = new Logger(ResearchController.name);

  constructor(private readonly researchService: ResearchService) {}

  @Post('generate')
  async generate(@Body() body: GenerateBody): Promise<ResearchGenerateResponse> {
    const { direction, apiBaseUrl, apiKey, modelName } = body;

    // 优先使用请求传入的配置，否则从全局配置读取
    let apiConfig = { apiBaseUrl: apiBaseUrl || '', apiKey: apiKey || '', modelName: modelName || '' };

    if (!apiConfig.apiBaseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
      const globalConfig = await this.researchService.getGlobalApiConfig();
      apiConfig = {
        apiBaseUrl: apiConfig.apiBaseUrl || globalConfig.apiBaseUrl,
        apiKey: apiConfig.apiKey || globalConfig.apiKey,
        modelName: apiConfig.modelName || globalConfig.modelName,
      };
    }

    return this.researchService.generate(direction || '', apiConfig);
  }

  @Post('plans')
  async savePlan(@Body() body: SavePlanBody): Promise<{ id: string; success: boolean }> {
    return this.researchService.savePlan({
      title: body.title,
      direction: body.direction,
      content: body.content || {},
      reagentsUsed: body.reagentsUsed || [],
      estimatedSavings: body.estimatedSavings || 0,
    });
  }

  @Get('plans')
  async getPlans(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ResearchPlanListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 10;
    return this.researchService.getPlanList(pageNum, size);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.researchService.deletePlan(id);
  }
}
