export type UserRole = 'admin' | 'user';

export interface LabUser {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
}

export interface AuthResponse {
  user: LabUser;
}

export interface LogoutResponse {
  success: boolean;
}

export type MaterialCategory =
  | 'antibody'
  | 'plasmid'
  | 'serum'
  | 'antibiotic'
  | 'primer'
  | 'other';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  catalogNo: string;
  specification: string;
  supplier: string;
  unitPrice: string;
  stock: number;
  purchaseDate: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialListResponse {
  items: Material[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MaterialStatistics {
  totalCount: number;
  categoryDistribution: { category: MaterialCategory; count: number }[];
  lowStockCount: number;
  monthlyPurchaseAmount: string;
}

export interface PriceHistoryItem {
  id: string;
  date: string;
  price: string;
  supplier: string;
  stockAdded: number;
  changePercent: number | null;
}

export interface PriceHistoryResponse {
  history: PriceHistoryItem[];
  avgPrice: string;
  maxPrice: string;
  minPrice: string;
  fluctuation: number;
  latestChangePercent: number | null;
}

export type PurchaseSource = 'manual' | 'ai-parse';
export type UploadStatus = 'pending' | 'parsing' | 'success' | 'failed';

export interface ParsedPurchaseItem {
  name: string;
  category: MaterialCategory;
  catalogNo: string;
  specification: string;
  supplier: string;
  unitPrice: number;
  stock: number;
  purchaseDate: string;
  remark: string;
  confidence: number;
  isNew: boolean;
  priceChange: number | null;
}

export interface UploadRecord {
  id: string;
  filename: string;
  status: UploadStatus;
  uploadDate: string;
  parsedCount: number;
  successCount: number;
  failedCount: number;
  errorMessage: string;
  createdAt: string;
}

export interface UploadListResponse {
  items: UploadRecord[];
  total: number;
}

export interface UploadParseResponse {
  uploadId: string;
  status: UploadStatus;
  parsedItems: ParsedPurchaseItem[];
  successCount: number;
  avgConfidence: number;
}

export interface ManualPurchaseResponse {
  id: string;
  isNew: boolean;
  priceChange: number | null;
}

export interface PriceHistoryByCatalogResponse {
  exists: boolean;
  avgPrice: number | null;
  lastPrice: number | null;
  history: { date: string; price: number; supplier: string }[];
}

export type ExpType =
  | 'IHC'
  | 'WB'
  | 'qPCR'
  | 'cell_culture'
  | 'siRNA'
  | 'flow'
  | 'other';

export interface ProtocolAttachment {
  bucketId: string;
  filePath: string;
  fileName: string;
  fileType: string;
}

export interface Protocol {
  id: string;
  name: string;
  nameEn: string;
  type: ExpType;
  description: string;
  descriptionEn: string;
  content: string;
  contentEn: string;
  sourceLang: 'zh' | 'en';
  attachments: ProtocolAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolListResponse {
  items: Protocol[];
  total: number;
}

export interface ProtocolAiParseRequest {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  text: string;
  sourceLang?: 'zh' | 'en';
}

export interface ProtocolAiParseResult {
  title: string;
  titleEn: string;
  type: ExpType;
  summary: string;
  summaryEn: string;
  content: string;
  contentEn: string;
  sourceLang: 'zh' | 'en';
}

export interface ProtocolFileParseResponse {
  fileName: string;
  text: string;
  detectedLang: 'zh' | 'en';
}

export interface AvailableReagent {
  id: string;
  name: string;
  category: string;
  stock: number;
  availability: 'sufficient' | 'partial' | 'none';
}

export interface ResearchPlanItem {
  id: string;
  title: string;
  angle: string;
  targets: string[];
  pathways: string[];
  availableReagents: AvailableReagent[];
  estimatedSavings: number;
  reasoning: string;
}

export interface ResearchGenerateResponse {
  plans: ResearchPlanItem[];
}

export interface ResearchPlanRecord {
  id: string;
  title: string;
  researchDirection: string;
  estimatedSavings: string;
  createdAt: string;
}

export interface ResearchPlanListResponse {
  items: ResearchPlanRecord[];
  total: number;
}

export interface GlobalApiConfig {
  isConfigured: boolean;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface ApiTestResponse {
  success: boolean;
  message: string;
  latencyMs: number;
}

export interface ApiStatusResponse {
  globalConfigured: boolean;
  personalPreferred: boolean;
}

export interface Account {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
}

export interface AccountListResponse {
  accounts: Account[];
}

export interface PersonalApiConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  preferred: boolean;
}

export type Language = 'zh' | 'en';
