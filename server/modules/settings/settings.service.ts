import {
  Injectable,
  Inject,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { labUsers, globalConfigs } from '@server/database/schema';
import { AuthService } from '../auth/auth.service';
import type { Account, UserRole, GlobalApiConfig } from '@shared/types';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authService: AuthService,
  ) {}

  async verifyAdminPassword(adminUserId: string, password: string): Promise<boolean> {
    const adminUsers = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, adminUserId))
      .limit(1);

    if (adminUsers.length === 0 || adminUsers[0].role !== 'admin') {
      return false;
    }

    return this.authService.verifyPassword(password, adminUsers[0].passwordHash);
  }

  async getAccounts(): Promise<Account[]> {
    const users = await this.db.select({
      id: labUsers.id,
      username: labUsers.username,
      role: labUsers.role,
      displayName: labUsers.displayName,
    }).from(labUsers);

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role as UserRole,
      displayName: u.displayName,
    }));
  }

  async updateAccount(
    id: string,
    data: { username?: string; password?: string; displayName?: string; adminPassword: string },
    adminUserId: string,
  ): Promise<{ success: boolean }> {
    const adminUsers = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, adminUserId))
      .limit(1);

    if (adminUsers.length === 0 || adminUsers[0].role !== 'admin') {
      throw new ForbiddenException('仅管理员可修改账号');
    }

    const isPasswordValid = await this.authService.verifyPassword(
      data.adminPassword,
      adminUsers[0].passwordHash,
    );

    if (!isPasswordValid) {
      throw new ForbiddenException('管理员密码错误');
    }

    const targetUsers = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, id))
      .limit(1);

    if (targetUsers.length === 0) {
      throw new NotFoundException('账号不存在');
    }

    const patch: Partial<typeof labUsers.$inferInsert> = {};

    if (data.username !== undefined) {
      if (!data.username.trim()) {
        throw new BadRequestException('用户名不能为空');
      }
      patch.username = data.username.trim();
    }

    if (data.password !== undefined) {
      if (!data.password) {
        throw new BadRequestException('密码不能为空');
      }
      patch.passwordHash = await this.authService.hashPassword(data.password);
    }

    if (data.displayName !== undefined) {
      patch.displayName = data.displayName;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const updated = await this.db
      .update(labUsers)
      .set(patch)
      .where(eq(labUsers.id, id))
      .returning({ id: labUsers.id });

    if (updated.length === 0) {
      throw new NotFoundException('账号不存在');
    }

    this.logger.log(`Account ${id} updated by admin ${adminUsers[0].username}`);
    return { success: true };
  }

  async getGlobalApiConfig(): Promise<GlobalApiConfig> {
    const configs = await this.db
      .select()
      .from(globalConfigs)
      .where(eq(globalConfigs.configKey, 'global_api'))
      .limit(1);

    if (configs.length === 0 || !configs[0].configValue) {
      return {
        isConfigured: false,
        apiBaseUrl: '',
        apiKey: '',
        modelName: '',
      };
    }

    try {
      const parsed = JSON.parse(configs[0].configValue);
      return {
        isConfigured: true,
        apiBaseUrl: parsed.apiBaseUrl || '',
        apiKey: parsed.apiKey || '',
        modelName: parsed.modelName || '',
      };
    } catch {
      return {
        isConfigured: false,
        apiBaseUrl: '',
        apiKey: '',
        modelName: '',
      };
    }
  }

  async saveGlobalApiConfig(
    apiBaseUrl: string,
    apiKey: string,
    modelName: string,
  ): Promise<{ success: boolean }> {
    const configValue = JSON.stringify({ apiBaseUrl, apiKey, modelName });

    const existing = await this.db
      .select()
      .from(globalConfigs)
      .where(eq(globalConfigs.configKey, 'global_api'))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(globalConfigs)
        .set({ configValue })
        .where(eq(globalConfigs.configKey, 'global_api'));
    } else {
      await this.db.insert(globalConfigs).values({
        configKey: 'global_api',
        configValue,
        description: 'Global API Configuration',
      });
    }

    return { success: true };
  }

  async getApiStatus(): Promise<{ globalConfigured: boolean }> {
    const config = await this.getGlobalApiConfig();
    return {
      globalConfigured: config.isConfigured,
    };
  }

  async testApiConnection(
    apiBaseUrl: string,
    apiKey: string,
    modelName: string,
  ): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const startTime = Date.now();

    try {
      const baseUrl = apiBaseUrl.replace(/\/$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'API 连接成功',
          latencyMs,
        };
      }

      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        message: `API 返回错误: ${response.status} ${errorText.slice(0, 100)}`,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : '连接失败';
      return {
        success: false,
        message: `无法连接 API: ${message}`,
        latencyMs,
      };
    }
  }
}
