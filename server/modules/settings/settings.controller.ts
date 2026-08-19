import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  Param,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from './settings.service';
import { AuthService } from '../auth/auth.service';
import type {
  AccountListResponse,
  GlobalApiConfig,
  ApiTestResponse,
  ApiStatusResponse,
} from '@shared/types';

const COOKIE_NAME = 'lab_token';

@Controller('api/settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
  ) {}

  private getCurrentUserId(req: Request): string {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      throw new ForbiddenException('未登录');
    }
    const payload = this.authService.verifyToken(token);
    if (!payload) {
      throw new ForbiddenException('登录已过期');
    }
    return payload.sub;
  }

  private async requireAdmin(req: Request): Promise<string> {
    const userId = this.getCurrentUserId(req);
    const user = await this.authService.getMe(userId);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可操作');
    }
    return userId;
  }

  @Get('accounts')
  async getAccounts(@Req() req: Request): Promise<AccountListResponse> {
    await this.requireAdmin(req);
    const accounts = await this.settingsService.getAccounts();
    return { accounts };
  }

  @Put('accounts/:id')
  async updateAccount(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { username?: string; password?: string; displayName?: string; adminPassword: string },
  ): Promise<{ success: boolean }> {
    const adminUserId = await this.requireAdmin(req);

    if (!body.adminPassword) {
      throw new BadRequestException('请输入管理员密码进行验证');
    }

    return this.settingsService.updateAccount(id, body, adminUserId);
  }

  @Get('global-api')
  async getGlobalApiConfig(@Req() req: Request): Promise<GlobalApiConfig> {
    await this.requireAdmin(req);
    return this.settingsService.getGlobalApiConfig();
  }

  @Put('global-api')
  async saveGlobalApiConfig(
    @Req() req: Request,
    @Body() body: { apiBaseUrl: string; apiKey: string; modelName: string; adminPassword: string },
  ): Promise<{ success: boolean }> {
    const adminUserId = await this.requireAdmin(req);

    if (!body.adminPassword) {
      throw new BadRequestException('请输入管理员密码进行验证');
    }

    const passwordValid = await this.settingsService.verifyAdminPassword(
      adminUserId,
      body.adminPassword,
    );
    if (!passwordValid) {
      throw new ForbiddenException('管理员密码错误');
    }

    return this.settingsService.saveGlobalApiConfig(
      body.apiBaseUrl,
      body.apiKey,
      body.modelName,
    );
  }

  @Post('test-api')
  async testApiConnection(
    @Body() body: { apiBaseUrl: string; apiKey: string; modelName: string },
  ): Promise<ApiTestResponse> {
    if (!body.apiBaseUrl || !body.apiKey || !body.modelName) {
      throw new BadRequestException('请填写完整的 API 配置信息');
    }
    return this.settingsService.testApiConnection(
      body.apiBaseUrl,
      body.apiKey,
      body.modelName,
    );
  }

  @Get('api-status')
  async getApiStatus(): Promise<ApiStatusResponse> {
    const status = await this.settingsService.getApiStatus();
    return {
      globalConfigured: status.globalConfigured,
      personalPreferred: false,
    };
  }
}
