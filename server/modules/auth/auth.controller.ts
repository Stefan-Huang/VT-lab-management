import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthResponse, LogoutResponse } from '@shared/types';

const COOKIE_NAME = 'lab_token';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    if (!body.username || !body.password) {
      throw new BadRequestException('用户名和密码不能为空');
    }

    const { user, token } = await this.authService.login(body.username, body.password);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { user };
  }

  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponse> {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @Get('me')
  async getMe(@Req() req: Request): Promise<AuthResponse> {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException('未登录');
    }

    const payload = this.authService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('登录已过期');
    }

    const user = await this.authService.getMe(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return { user };
  }
}
