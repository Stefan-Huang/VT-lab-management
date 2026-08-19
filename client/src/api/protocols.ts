import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Protocol,
  ProtocolListResponse,
  ProtocolAttachment,
  ExpType,
  ProtocolAiParseResult,
  ProtocolFileParseResponse,
} from '@shared/types';

export interface ProtocolListParams {
  expType?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateProtocolData {
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

export type UpdateProtocolData = Partial<CreateProtocolData>;

export async function getProtocols(
  params: ProtocolListParams,
): Promise<ProtocolListResponse> {
  try {
    const response = await axiosForBackend.get('/api/protocols', { params });
    return response.data;
  } catch (error) {
    logger.error('获取 Protocol 列表失败', error);
    throw error;
  }
}

export async function getProtocolById(id: string): Promise<Protocol> {
  try {
    const response = await axiosForBackend.get(`/api/protocols/${id}`);
    return response.data;
  } catch (error) {
    logger.error('获取 Protocol 详情失败', error);
    throw error;
  }
}

export async function createProtocol(
  data: CreateProtocolData,
): Promise<{ id: string; success: boolean }> {
  try {
    const response = await axiosForBackend.post('/api/protocols', data);
    return response.data;
  } catch (error) {
    logger.error('创建 Protocol 失败', error);
    throw error;
  }
}

export async function updateProtocol(
  id: string,
  data: UpdateProtocolData,
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend.put(`/api/protocols/${id}`, data);
    return response.data;
  } catch (error) {
    logger.error('更新 Protocol 失败', error);
    throw error;
  }
}

export async function deleteProtocol(
  id: string,
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend.delete(`/api/protocols/${id}`);
    return response.data;
  } catch (error) {
    logger.error('删除 Protocol 失败', error);
    throw error;
  }
}

export async function uploadProtocolFile(
  file: File,
): Promise<ProtocolFileParseResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosForBackend.post(
      '/api/protocols/upload-file',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  } catch (error) {
    logger.error('上传 Protocol 文件失败', error);
    throw error;
  }
}

export interface AiParseParams {
  text: string;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  sourceLang?: 'zh' | 'en';
}

export async function aiParseProtocol(
  params: AiParseParams,
): Promise<ProtocolAiParseResult> {
  try {
    const response = await axiosForBackend.post(
      '/api/protocols/ai-parse',
      params,
    );
    return response.data;
  } catch (error) {
    logger.error('AI 解析 Protocol 失败', error);
    throw error;
  }
}

export interface TranslateParams {
  text: string;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  targetLang: 'zh' | 'en';
}

export async function translateProtocol(
  params: TranslateParams,
): Promise<{ translated: string }> {
  try {
    const response = await axiosForBackend.post(
      '/api/protocols/translate',
      params,
    );
    return response.data;
  } catch (error) {
    logger.error('翻译 Protocol 失败', error);
    throw error;
  }
}
