import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Post as NestPost,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProtocolsService } from './protocols.service';
import { FileParseService } from './file-parse.service';
import { AiParseService } from './ai-parse.service';
import type {
  Protocol,
  ProtocolListResponse,
  ProtocolAttachment,
  ExpType,
  ProtocolAiParseResult,
  ProtocolFileParseResponse,
} from '@shared/types';

interface CreateProtocolBody {
  name: string;
  nameEn?: string;
  type: ExpType;
  description?: string;
  descriptionEn?: string;
  content: string;
  contentEn?: string;
  sourceLang?: 'zh' | 'en';
  attachments?: ProtocolAttachment[];
}

interface UpdateProtocolBody {
  name?: string;
  nameEn?: string;
  type?: ExpType;
  description?: string;
  descriptionEn?: string;
  content?: string;
  contentEn?: string;
  sourceLang?: 'zh' | 'en';
  attachments?: ProtocolAttachment[];
}

interface AiParseBody {
  text: string;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  sourceLang?: 'zh' | 'en';
}

interface TranslateBody {
  text: string;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  targetLang: 'zh' | 'en';
}

@Controller('api/protocols')
export class ProtocolsController {
  constructor(
    private readonly protocolsService: ProtocolsService,
    private readonly fileParseService: FileParseService,
    private readonly aiParseService: AiParseService,
  ) {}

  @Get()
  async getList(
    @Query('expType') expType?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ProtocolListResponse> {
    return this.protocolsService.getList({
      expType,
      keyword,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<Protocol> {
    return this.protocolsService.getById(id);
  }

  @Post()
  async create(@Body() body: CreateProtocolBody): Promise<{ id: string; success: boolean }> {
    return this.protocolsService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProtocolBody,
  ): Promise<{ success: boolean }> {
    return this.protocolsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.protocolsService.remove(id);
  }

  @NestPost('upload-file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProtocolFileParseResponse> {
    if (!file) {
      throw new BadRequestException('请选择文件');
    }
    return this.fileParseService.parseFile(file);
  }

  @NestPost('ai-parse')
  async aiParse(@Body() body: AiParseBody): Promise<ProtocolAiParseResult> {
    if (!body.text?.trim()) {
      throw new BadRequestException('文本内容不能为空');
    }
    return this.aiParseService.parseProtocolText(
      body.apiBaseUrl,
      body.apiKey,
      body.modelName,
      body.text,
      (body.sourceLang as 'zh' | 'en') || 'zh',
    );
  }

  @NestPost('translate')
  async translate(@Body() body: TranslateBody): Promise<{ translated: string }> {
    if (!body.text?.trim()) {
      return { translated: '' };
    }
    const translated = await this.aiParseService.translateContent(
      body.apiBaseUrl,
      body.apiKey,
      body.modelName,
      body.text,
      body.targetLang,
    );
    return { translated };
  }
}
