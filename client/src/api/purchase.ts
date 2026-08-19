import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  MaterialCategory,
  ManualPurchaseResponse,
  PriceHistoryByCatalogResponse,
  UploadListResponse,
  UploadParseResponse,
  ParsedPurchaseItem,
} from '@shared/types';

export async function getPriceHistoryByCatalog(
  catalogNo: string,
): Promise<PriceHistoryByCatalogResponse> {
  try {
    const response = await axiosForBackend.get('/api/purchase/price-history', {
      params: { catalogNo },
    });
    return response.data;
  } catch (error) {
    logger.error('获取同货号价格历史失败', error);
    throw error;
  }
}

export async function manualPurchase(data: {
  name: string;
  category: MaterialCategory;
  catalogNo: string;
  specification?: string;
  supplier?: string;
  unitPrice: number;
  stock?: number;
  purchaseDate: string;
  remark?: string;
}): Promise<ManualPurchaseResponse> {
  try {
    const response = await axiosForBackend.post('/api/purchase/manual', data);
    return response.data;
  } catch (error) {
    logger.error('手动添加采购失败', error);
    throw error;
  }
}

export async function uploadAndParse(
  file: File,
  llmConfig?: { apiBaseUrl: string; apiKey: string; modelName: string },
): Promise<UploadParseResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (llmConfig) {
      formData.append('apiBaseUrl', llmConfig.apiBaseUrl);
      formData.append('apiKey', llmConfig.apiKey);
      formData.append('modelName', llmConfig.modelName);
    }
    const response = await axiosForBackend.post('/api/purchase/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    logger.error('上传解析失败', error);
    throw error;
  }
}

export async function confirmUpload(
  uploadId: string,
  items: ParsedPurchaseItem[],
): Promise<{ success: boolean; insertedCount: number }> {
  try {
    const response = await axiosForBackend.post(
      `/api/purchase/upload/${uploadId}/confirm`,
      { items },
    );
    return response.data;
  } catch (error) {
    logger.error('确认入库失败', error);
    throw error;
  }
}

export async function getUploadHistory(
  page: number,
  pageSize: number,
): Promise<UploadListResponse> {
  try {
    const response = await axiosForBackend.get('/api/purchase/uploads', {
      params: { page, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取上传历史失败', error);
    throw error;
  }
}
