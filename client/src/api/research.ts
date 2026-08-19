import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ResearchGenerateResponse,
  ResearchPlanListResponse,
  ResearchPlanItem,
} from '@shared/types';

interface GenerateParams {
  direction: string;
  apiBaseUrl?: string;
  apiKey?: string;
  modelName?: string;
}

export async function generatePlans(
  params: GenerateParams,
): Promise<ResearchGenerateResponse> {
  const response = await axiosForBackend.post('/api/research/generate', params);
  return response.data;
}

interface SavePlanParams {
  title: string;
  direction: string;
  content: ResearchPlanItem;
  reagentsUsed: Array<Record<string, unknown>>;
  estimatedSavings: number;
}

export async function savePlan(
  params: SavePlanParams,
): Promise<{ id: string; success: boolean }> {
  const response = await axiosForBackend.post('/api/research/plans', params);
  return response.data;
}

export async function getPlanList(params?: {
  page?: number;
  pageSize?: number;
}): Promise<ResearchPlanListResponse> {
  const { page = 1, pageSize = 10 } = params || {};
  const response = await axiosForBackend.get('/api/research/plans', {
    params: { page, pageSize },
  });
  return response.data;
}

export async function deletePlan(
  id: string,
): Promise<{ success: boolean }> {
  const response = await axiosForBackend.delete(`/api/research/plans/${id}`);
  return response.data;
}
