import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  GlobalApiConfig,
  ApiTestResponse,
  ApiStatusResponse,
  AccountListResponse,
} from '@shared/types';

export async function getGlobalApiConfig(): Promise<GlobalApiConfig> {
  const response = await axiosForBackend.get('/api/settings/global-api');
  return response.data;
}

export async function saveGlobalApiConfig(params: {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  adminPassword: string;
}): Promise<{ success: boolean }> {
  const response = await axiosForBackend.put('/api/settings/global-api', params);
  return response.data;
}

export async function testApiConnection(params: {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
}): Promise<ApiTestResponse> {
  const response = await axiosForBackend.post('/api/settings/test-api', params);
  return response.data;
}

export async function getApiStatus(): Promise<ApiStatusResponse> {
  const response = await axiosForBackend.get('/api/settings/api-status');
  return response.data;
}

export async function getAccounts(): Promise<AccountListResponse> {
  const response = await axiosForBackend.get('/api/settings/accounts');
  return response.data;
}

export async function updateAccount(
  id: string,
  params: {
    username?: string;
    displayName?: string;
    password?: string;
    adminPassword: string;
  },
): Promise<{ success: boolean }> {
  const response = await axiosForBackend.put(`/api/settings/accounts/${id}`, params);
  return response.data;
}
