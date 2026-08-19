import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { labUsers } from '@server/database/schema';
import type { LabUser, UserRole } from '@shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'lab-management-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  generateToken(userId: string, username: string, role: UserRole): string {
    return jwt.sign({ sub: userId, username, role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  verifyToken(token: string): { sub: string; username: string; role: UserRole } | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        username: string;
        role: UserRole;
      };
      return payload;
    } catch {
      return null;
    }
  }

  async login(username: string, password: string): Promise<{ user: LabUser; token: string }> {
    const users = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.username, username))
      .limit(1);

    if (users.length === 0) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const labUser: LabUser = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      displayName: user.displayName,
    };

    const token = this.generateToken(user.id, user.username, user.role as UserRole);

    this.logger.log(`User ${username} logged in successfully`);
    return { user: labUser, token };
  }

  async getMe(userId: string): Promise<LabUser | null> {
    const users = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, userId))
      .limit(1);

    if (users.length === 0) return null;

    const user = users[0];
    return {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      displayName: user.displayName,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
