import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { AuthResponse, LogoutResponse } from '@shared/types';

export async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    const response = await axiosForBackend.post('/api/auth/login', {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    logger.error('Login failed', error);
    throw error;
  }
}

export async function logout(): Promise<LogoutResponse> {
  try {
    const response = await axiosForBackend.post('/api/auth/logout');
    return response.data;
  } catch (error) {
    logger.error('Logout failed', error);
    throw error;
  }
}

export async function getMe(): Promise<AuthResponse> {
  try {
    const response = await axiosForBackend.get('/api/auth/me');
    return response.data;
  } catch (error) {
    logger.error('Get me failed', error);
    throw error;
  }
}
