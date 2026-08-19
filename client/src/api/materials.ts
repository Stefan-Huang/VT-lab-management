import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  MaterialListResponse,
  Material,
  MaterialStatistics,
  PriceHistoryResponse,
  MaterialCategory,
} from '@shared/types';

export interface MaterialListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getMaterials(params: MaterialListParams): Promise<MaterialListResponse> {
  try {
    const response = await axiosForBackend.get('/api/materials', { params });
    return response.data;
  } catch (error) {
    logger.error('获取物资列表失败', error);
    throw error;
  }
}

export async function getMaterialStatistics(): Promise<MaterialStatistics> {
  try {
    const response = await axiosForBackend.get('/api/materials/statistics');
    return response.data;
  } catch (error) {
    logger.error('获取物资统计失败', error);
    throw error;
  }
}

export async function getMaterialById(id: string): Promise<Material> {
  try {
    const response = await axiosForBackend.get(`/api/materials/${id}`);
    return response.data;
  } catch (error) {
    logger.error('获取物资详情失败', error);
    throw error;
  }
}

export async function getPriceHistory(id: string): Promise<PriceHistoryResponse> {
  try {
    const response = await axiosForBackend.get(`/api/materials/${id}/price-history`);
    return response.data;
  } catch (error) {
    logger.error('获取价格历史失败', error);
    throw error;
  }
}

export async function createMaterial(data: {
  name: string;
  category: MaterialCategory;
  catalogNo: string;
  specification?: string;
  supplier?: string;
  unitPrice: number;
  stock?: number;
  purchaseDate: string;
  remark?: string;
}): Promise<Material> {
  try {
    const response = await axiosForBackend.post('/api/materials', data);
    return response.data;
  } catch (error) {
    logger.error('创建物资失败', error);
    throw error;
  }
}

export async function updateMaterial(
  id: string,
  data: Partial<{
    name: string;
    category: MaterialCategory;
    catalogNo: string;
    specification: string;
    supplier: string;
    unitPrice: number;
    stock: number;
    purchaseDate: string;
    remark: string;
  }>,
): Promise<Material> {
  try {
    const response = await axiosForBackend.put(`/api/materials/${id}`, data);
    return response.data;
  } catch (error) {
    logger.error('更新物资失败', error);
    throw error;
  }
}

export async function deleteMaterial(id: string): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend.delete(`/api/materials/${id}`);
    return response.data;
  } catch (error) {
    logger.error('删除物资失败', error);
    throw error;
  }
}
