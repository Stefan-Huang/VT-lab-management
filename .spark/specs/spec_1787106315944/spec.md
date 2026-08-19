# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [数据库, 服务端, 前端]
- 技术栈: NestJS + React 19 + Drizzle ORM + PostgreSQL + Tailwind CSS + shadcn/ui

## 页面路由与导航

### 页面路由
| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 应用唯一入口，未登录用户跳转至此 |
| `/materials` | 物资总览页 | 登录后首页，库存全局总览与检索 |
| `/materials/:id` | 物资详情页 | 单种物资全量信息与价格历史 |
| `/purchase` | 采购录入页 | AI 批量解析与手动录入 |
| `/research` | 课题辅助设计页 | AI 课题推荐与试剂匹配 |
| `/protocols` | Protocol 库页 | 实验方案浏览与检索 |
| `/protocols/:id` | Protocol 详情页 | 单个实验方案完整展示 |
| `/settings` | 系统设置页 | API 配置与账号管理 |

### 导航设计
- 导航机制：页面路由
- 导航项（左侧侧边栏，登录后可见）：
  - 物资总览 `/materials`
  - 采购录入 `/purchase`
  - 课题辅助 `/research`
  - Protocol 库 `/protocols`
  - 系统设置 `/settings`
- 顶部栏：左侧 Logo + 应用名称；中间显示当前使用 Key 状态（个人/全局）；右侧依次为语言切换按钮、用户名 + 退出登录下拉

### 路由守卫
- 未登录用户访问非 `/login` 路径时，统一重定向至 `/login`
- 已登录用户访问 `/login` 时，重定向至 `/materials`
- 登录状态通过服务端 session 校验，前端路由守卫配合 `useAuth` hook 实现

## 数据模型

### 数据库设计

#### 实验室用户表（lab_user）
用途：存储实验室系统的自定义登录账号（管理员与实验员两个预设账号）。
核心字段：
- username: varchar (登录用户名，唯一)
- password_hash: varchar (密码哈希，bcrypt)
- role: varchar ['admin', 'labuser'] (角色)
- display_name: varchar (显示名称)

#### 物资表（material）
用途：存储实验室库存物资的当前信息与最新状态。
核心字段：
- name: varchar (物资名称)
- category: varchar ['antibody', 'plasmid', 'serum', 'antibiotic', 'primer', 'other'] (类别)
- catalog_no: varchar (货号)
- specification: varchar (规格)
- supplier: varchar (供应商)
- unit_price: numeric (当前单价)
- stock: integer (存量)
- purchase_date: date (最新采购日期)
- remark: text (备注)
关联关系：与采购记录表是一对多关系

#### 采购记录表（purchase_record）
用途：记录每次采购的物资价格信息，支撑价格历史时间线与涨跌幅计算。
核心字段：
- material_id: uuid (关联物资 ID)
- unit_price: numeric (采购单价)
- supplier: varchar (供应商)
- purchase_date: date (采购日期)
- stock_added: integer (本次入库数量)
- source: varchar ['manual', 'ai-parse'] (录入来源)
- batch_no: varchar (关联上传批次号)
关联关系：belongsTo material（多对一）

#### 上传记录表（upload_record）
用途：记录 Excel/CSV 采购文件上传与 AI 解析的历史批次。
核心字段：
- file_name: varchar (原始文件名)
- file_path: varchar (文件存储路径)
- status: varchar ['pending', 'parsing', 'success', 'failed'] (解析状态)
- parsed_count: integer (解析条目数)
- success_count: integer (成功入库数)
- avg_confidence: numeric (平均置信度)
- error_message: text (错误信息)

#### Protocol 表（protocol）
用途：存储实验方案的元信息、正文内容与附件。
核心字段：
- name: varchar (实验名称)
- exp_type: varchar ['IHC', 'WB', 'qPCR', 'cell_culture', 'siRNA', 'flow', 'other'] (实验类型)
- summary: text (简介摘要)
- content: text (正文内容，Markdown/纯文本)
- attachments: jsonb (附件列表，每项含 bucket_id、file_path、file_name)
- is_sample: boolean (是否为预置示例)

#### 课题方案表（research_plan）
用途：保存用户生成的课题辅助设计方案记录。
核心字段：
- title: varchar (方案标题)
- research_direction: text (研究方向输入)
- content: jsonb (AI 生成的完整推荐内容，含多个方案条目)
- reagents_used: jsonb (可利用的现有试剂清单摘要)
- estimated_savings: numeric (预计节省经费)
- created_by: varchar (创建者用户名)

#### 全局配置表（global_config）
用途：存储管理员配置的全局 API 参数，加密保存。仅一条记录。
核心字段：
- config_key: varchar (配置键名，唯一，如 'global_api')
- api_base_url: varchar (加密存储，API Base URL)
- api_key: varchar (加密存储，API Key)
- model_name: varchar (模型名称)
- is_configured: boolean (是否已配置)

**加密说明**：api_base_url 与 api_key 使用 AES-256 加密后存储，密钥从服务端环境变量读取，禁止明文落库。

## 业务模型

### API 设计

#### 认证相关
**页面路径**: /login
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 用户登录 | API | POST /api/auth/login |
| 用户登出 | API | POST /api/auth/logout |
| 获取当前用户信息 | API | GET /api/auth/me |
| 语言切换 | 前端 | localStorage + i18n context |

**所需 API**:
```typescript
// 登录 [领域模型: LabUser] [对应页面功能: 登录表单提交]
POST /api/auth/login
Request: { username: string; password: string; }
Response: { user: { id: string; username: string; role: string; displayName: string }; }

// 获取当前登录用户 [领域模型: LabUser] [对应页面功能: 顶部栏用户名显示/路由守卫]
GET /api/auth/me
Response: { user: { id: string; username: string; role: string; displayName: string } | null; }

// 登出 [领域模型: LabUser] [对应页面功能: 退出登录]
POST /api/auth/logout
Response: { success: boolean; }
```

#### 物资总览页相关
**页面路径**: /materials
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 物资列表查询（含筛选/搜索/排序/分页） | API | GET /api/materials |
| 顶部统计卡片数据 | API | GET /api/materials/statistics |
| 导出 Excel/CSV | API | GET /api/materials/export |
| 删除物资 | API | DELETE /api/materials/:id |

**所需 API**:
```typescript
// 物资列表查询 [领域模型: Material] [对应页面功能: 表格展示/筛选/搜索/排序]
GET /api/materials?category=&keyword=&sortBy=price|purchaseDate&sortOrder=asc|desc&page=1&pageSize=20
Response: {
  items: Array<{
    id: string; name: string; category: string; catalogNo: string;
    specification: string; supplier: string; unitPrice: number;
    stock: number; purchaseDate: string; remark: string;
  }>;
  total: number;
}

// 统计概览 [领域模型: Material] [对应页面功能: 顶部统计卡片]
GET /api/materials/statistics
Response: {
  totalCount: number;
  categoryDistribution: Array<{ category: string; count: number }>;
  lowStockCount: number;
  monthlyPurchaseAmount: number;
}

// 导出物资清单 [领域模型: Material] [对应页面功能: 导出 Excel/CSV]
GET /api/materials/export?format=xlsx|csv&category=&keyword=
Response: binary file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet or text/csv)

// 删除物资 [领域模型: Material] [对应页面功能: 物资详情页删除]
DELETE /api/materials/:id
Response: { success: boolean; }
```

#### 采购录入页相关
**页面路径**: /purchase
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 上传 Excel/CSV 并 AI 解析 | API + LLM 调用 | POST /api/purchase/upload（服务端解析后调用 LLM 结构化） |
| 手动添加物资 | API | POST /api/purchase/manual |
| 同货号历史价格查询 | API | GET /api/purchase/price-history?catalogNo= |
| 上传历史列表 | API | GET /api/purchase/uploads |

**所需 API**:
```typescript
// 上传采购文件并 AI 解析 [领域模型: UploadRecord + PurchaseRecord] [对应页面功能: 拖拽上传 + AI 智能解析]
POST /api/purchase/upload
Request: multipart/form-data (file: File)
Response: {
  uploadId: string;
  status: string;
  parsedItems: Array<{
    name: string; category: string; catalogNo: string; specification: string;
    supplier: string; unitPrice: number; stock: number; purchaseDate: string;
    remark: string; confidence: number; isNew: boolean; priceChange: number | null;
  }>;
  successCount: number;
  avgConfidence: number;
}

// 确认并批量入库解析结果 [领域模型: Material + PurchaseRecord] [对应页面功能: 确认解析结果入库]
POST /api/purchase/upload/:id/confirm
Request: { items: Array<{ name: string; category: string; catalogNo: string; specification: string; supplier: string; unitPrice: number; stock: number; purchaseDate: string; remark: string; }> }
Response: { success: boolean; insertedCount: number; }

// 手动添加物资 [领域模型: Material + PurchaseRecord] [对应页面功能: 手动逐条添加]
POST /api/purchase/manual
Request: { name: string; category: string; catalogNo: string; specification: string; supplier: string; unitPrice: number; stock: number; purchaseDate: string; remark: string; }
Response: { id: string; isNew: boolean; priceChange: number | null; }

// 查询同货号历史价格 [领域模型: PurchaseRecord] [对应页面功能: 价格上涨标红提示]
GET /api/purchase/price-history?catalogNo=xxx
Response: {
  exists: boolean;
  avgPrice: number | null;
  lastPrice: number | null;
  history: Array<{ date: string; price: number; supplier: string }>;
}

// 上传历史列表 [领域模型: UploadRecord] [对应页面功能: 上传历史记录]
GET /api/purchase/uploads?page=1&pageSize=10
Response: {
  items: Array<{
    id: string; fileName: string; status: string;
    parsedCount: number; successCount: number; avgConfidence: number;
    createdAt: string;
  }>;
  total: number;
}
```

#### 物资详情页相关
**页面路径**: /materials/:id
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 获取物资详情 | API | GET /api/materials/:id |
| 价格历史时间线 | API | GET /api/materials/:id/price-history |
| 编辑物资信息 | API | PUT /api/materials/:id |

**所需 API**:
```typescript
// 物资详情 [领域模型: Material] [对应页面功能: 基本信息展示]
GET /api/materials/:id
Response: {
  id: string; name: string; category: string; catalogNo: string;
  specification: string; supplier: string; unitPrice: number;
  stock: number; purchaseDate: string; remark: string;
}

// 价格历史 [领域模型: PurchaseRecord] [对应页面功能: 价格历史时间线 + 涨跌幅计算]
GET /api/materials/:id/price-history
Response: {
  history: Array<{
    id: string; date: string; price: number; supplier: string;
    stockAdded: number; changePercent: number | null;
  }>;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  fluctuation: number;
  latestChangePercent: number | null;
}

// 编辑物资 [领域模型: Material] [对应页面功能: 编辑物资信息]
PUT /api/materials/:id
Request: { name: string; category: string; catalogNo: string; specification: string; supplier: string; unitPrice: number; stock: number; purchaseDate: string; remark: string; }
Response: { success: boolean; }
```

#### 课题辅助设计页相关
**页面路径**: /research
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| AI 生成课题推荐 | API + LLM 调用 | POST /api/research/generate（服务端调用 LLM） |
| 保存方案记录 | API | POST /api/research/plans |
| 已保存方案列表 | API | GET /api/research/plans |
| 删除方案 | API | DELETE /api/research/plans/:id |

**所需 API**:
```typescript
// AI 生成课题推荐 [领域模型: ResearchPlan] [对应页面功能: 输入研究方向 + AI 推荐结果]
POST /api/research/generate
Request: { direction: string; }
Response: {
  plans: Array<{
    id: string; title: string; angle: string;
    targets: Array<string>;
    pathways: Array<string>;
    availableReagents: Array<{ id: string; name: string; category: string; stock: number; availability: 'sufficient' | 'partial' | 'none' }>;
    estimatedSavings: number;
    reasoning: string;
  }>;
}

// 保存方案 [领域模型: ResearchPlan] [对应页面功能: 保存方案记录]
POST /api/research/plans
Request: { title: string; direction: string; content: any; reagentsUsed: any; estimatedSavings: number; }
Response: { id: string; success: boolean; }

// 方案列表 [领域模型: ResearchPlan] [对应页面功能: 历史记录查看]
GET /api/research/plans?page=1&pageSize=10
Response: {
  items: Array<{ id: string; title: string; direction: string; estimatedSavings: number; createdAt: string; }>;
  total: number;
}

// 删除方案 [领域模型: ResearchPlan] [对应页面功能: 方案操作]
DELETE /api/research/plans/:id
Response: { success: boolean; }
```

#### Protocol 库相关
**页面路径**: /protocols, /protocols/:id
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| Protocol 列表（筛选/搜索） | API | GET /api/protocols |
| Protocol 详情 | API | GET /api/protocols/:id |
| 新建 Protocol | API | POST /api/protocols |
| 编辑 Protocol | API | PUT /api/protocols/:id |
| 删除 Protocol | API | DELETE /api/protocols/:id |
| 文件上传 | 平台能力 | 前端 file storage service |

**所需 API**:
```typescript
// Protocol 列表 [领域模型: Protocol] [对应页面功能: 卡片列表/筛选/搜索]
GET /api/protocols?expType=&keyword=&page=1&pageSize=12
Response: {
  items: Array<{
    id: string; name: string; expType: string; summary: string; isSample: boolean;
  }>;
  total: number;
}

// Protocol 详情 [领域模型: Protocol] [对应页面功能: 详情页完整展示]
GET /api/protocols/:id
Response: {
  id: string; name: string; expType: string; summary: string;
  content: string;
  attachments: Array<{ bucketId: string; filePath: string; fileName: string; fileType: string }>;
  isSample: boolean;
}

// 新建 Protocol [领域模型: Protocol] [对应页面功能: 新建弹窗表单]
POST /api/protocols
Request: { name: string; expType: string; summary: string; content: string; attachments: Array<{ bucketId: string; filePath: string; fileName: string; fileType: string }>; }
Response: { id: string; success: boolean; }

// 编辑 Protocol [领域模型: Protocol] [对应页面功能: 详情页编辑]
PUT /api/protocols/:id
Request: { name: string; expType: string; summary: string; content: string; attachments: Array<{ bucketId: string; filePath: string; fileName: string; fileType: string }>; }
Response: { success: boolean; }

// 删除 Protocol [领域模型: Protocol] [对应页面功能: 详情页删除]
DELETE /api/protocols/:id
Response: { success: boolean; }
```

#### 系统设置页相关
**页面路径**: /settings
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 获取全局 API 配置（管理员） | API | GET /api/settings/global-api |
| 保存全局 API 配置（管理员） | API | PUT /api/settings/global-api |
| 测试 API 连接 | API | POST /api/settings/test-api |
| 获取账号列表（管理员） | API | GET /api/settings/accounts |
| 修改账号密码（管理员） | API | PUT /api/settings/accounts/:id |
| 获取当前使用 Key 状态 | API | GET /api/settings/api-status |

**所需 API**:
```typescript
// 获取全局 API 配置 [领域模型: GlobalConfig] [对应页面功能: 全局 API 配置表单]
GET /api/settings/global-api
Response: { isConfigured: boolean; apiBaseUrl: string; apiKey: string; modelName: string; }

// 保存全局 API 配置 [领域模型: GlobalConfig] [对应页面功能: 全局 API 配置保存]
PUT /api/settings/global-api
Request: { apiBaseUrl: string; apiKey: string; modelName: string; adminPassword: string; }
Response: { success: boolean; }

// 测试 API 连接 [领域模型: GlobalConfig] [对应页面功能: 测试 API 连接按钮]
POST /api/settings/test-api
Request: { apiBaseUrl: string; apiKey: string; modelName: string; }
Response: { success: boolean; message: string; latencyMs: number; }

// 获取账号列表 [领域模型: LabUser] [对应页面功能: 账号管理区]
GET /api/settings/accounts
Response: { accounts: Array<{ id: string; username: string; role: string; displayName: string }>; }

// 修改账号 [领域模型: LabUser] [对应页面功能: 修改用户名和密码]
PUT /api/settings/accounts/:id
Request: { username: string; password: string; adminPassword: string; displayName: string; }
Response: { success: boolean; }

// 当前 API 状态 [领域模型: GlobalConfig] [对应页面功能: 顶部栏 Key 状态显示]
GET /api/settings/api-status
Response: { globalConfigured: boolean; personalPreferred: boolean; }
```

## LLM 服务设计

### 调用方式
- 服务端通过 `LLMService` 统一封装 OpenAI 兼容格式的 Chat Completions 调用
- 支持配置 `apiBaseUrl`、`apiKey`、`modelName`，兼容 DeepSeek、通义千问等 OpenAI 兼容接口
- 优先级：个人 Key（用户开启时且 localStorage 中存在）> 全局 Key（服务端加密存储）
- 个人 Key 模式下，前端直接调用 LLM（通过封装好的 client service，不经过服务端转发），避免泄露个人 Key
- 全局 Key 模式下，走服务端调用，Key 不暴露给前端

### 采购解析 Prompt 设计
- 输入：Excel/CSV 解析后的原始表格数据（JSON 格式）
- 输出：结构化物资数组，每条包含 name/category/catalogNo/specification/supplier/unitPrice/stock/purchaseDate/remark/confidence
- 使用 ai-text-to-json 等价的 prompt 策略，指定 JSON schema 约束输出

### 课题推荐 Prompt 设计
- 输入：用户研究方向文本 + 现有试剂清单（抗体/质粒/引物）
- 输出：3-5 个推荐方案，每个含标题、研究角度、核心靶点/通路、可利用试剂清单、预计节省经费、推理说明

## 国际化设计

### 实现方式
- 前端使用 React Context + 自定义 `useI18n` hook
- 语言资源文件：`client/src/i18n/zh.ts`、`client/src/i18n/en.ts`
- 默认语言：从 localStorage 读取，若无则跟随浏览器语言，否则中文
- 所有页面文案通过 `t(key)` 函数获取，禁止硬编码文本

### 语言切换
- 顶部栏中/EN 按钮切换，切换后即时更新全局文案
- 语言偏好存储于 localStorage（key: `lab-i18n-lang`）
- 刷新后自动恢复用户选择的语言

## 数据预置

### 预置账号
- admin / admin123（角色：admin）
- labuser / lab123（角色：labuser）

### 预置 Protocol 示例（5条）
- WB（Western Blot）实验流程
- IHC（免疫组化）实验流程
- qPCR 实验流程
- 细胞培养实验流程
- siRNA 转染实验流程

### 预置物资示例数据
- 约 10 条覆盖各类别的示例物资，用于首页展示和筛选测试

## 前端架构

### 全局状态管理
- 使用 Zustand 管理：auth 状态、i18n 语言状态、API 配置状态
- React Query 管理服务端数据缓存与刷新

### 布局结构
- `AppLayout`：侧边栏 + 顶部栏 + 主内容区（登录后页面共用）
- `AuthLayout`：居中卡片布局（仅登录页使用）
- 侧边栏：Logo + 5 个导航项 + 可折叠
- 顶部栏：API Key 状态指示 + 语言切换 + 用户菜单（用户名 + 退出）

### UI 规范
- 主色调：蓝绿色系（teal/cyan）+ 灰色系，禁用紫色/靛蓝色
- 组件库：shadcn/ui + Tailwind CSS + lucide-react 图标
- 表格：shadcn Table + 自定义样式
- 响应式：桌面端优先（≥1280px），侧边栏在移动端可收起

### 文件上传
- 采购文件上传：使用 `react-dropzone` 实现拖拽上传，xlsx 库解析原始表格
- Protocol 附件上传：使用平台文件存储服务（dataloom.storage）
- 文件大小限制：单文件 ≤ 10MB