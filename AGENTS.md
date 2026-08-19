# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 科研实验室人员（管理员/实验员），高频桌面端操作，需精准数据识别与AI辅助决策
- **核心目的**: 高效管理物资库存 + 智能辅助课题设计，建立专业可信的科研工作流
- **情绪基调**: 专注严谨 / 避免焦虑混乱、廉价科技感

### 1.2 设计方向

- **Design Style**: Grid 网格 — 实验室精密仪器感，等宽字体强化数据对齐，锐利边框传递科学严谨性
- **Application Type**: Admin/SaaS — 侧边栏导航+顶部栏，桌面端优先的高信息密度布局
- **Aesthetic Direction**: 冷调蓝绿灰基底，数据驱动型界面，用色彩编码替代装饰元素

## 2. Color System (色彩系统)

**色彩关系**: 深青蓝主色 + 冷灰底 + 语义化状态色（红/黄/绿）
**配色设计理由**: 蓝绿灰符合实验室专业氛围，低饱和度背景减少长时间使用疲劳，状态色直接关联业务含义
**主色推导**: primary 取深青蓝(H:187)，呼应实验室玻璃器皿与试剂瓶的冷静质感，用于所有核心操作入口
**使用比例**: 60% 冷灰中性底 / 30% 白色卡片容器 / 10% 深青蓝主交互；状态色仅用于存量预警、价格涨跌、置信度标记

### 2.1 主题颜色

| Token                | HSL 值               | 说明                                   |
| -------------------- | -------------------- | -------------------------------------- |
| `background`         | hsl(210 15% 97%)     | 冷灰蓝页面底色，降低视觉疲劳           |
| `card`               | hsl(0 0% 100%)       | 纯白卡片容器                           |
| `foreground`         | hsl(210 25% 12%)     | 深墨蓝主文字，非纯黑                   |
| `muted-foreground`   | hsl(210 10% 50%)     | 次要说明文字                           |
| `primary`            | hsl(187 45% 38%)     | 深青蓝主交互色                         |
| `primary-foreground` | hsl(0 0% 100%)       | 主按钮文字                             |
| `accent`             | hsl(187 20% 94%)     | hover/focus/skeleton 反馈背景          |
| `accent-foreground`  | hsl(187 45% 30%)     | accent 上的文字                        |
| `border`             | hsl(210 12% 88%)     | 分割线与边框                           |

### 2.2 导航区配色

- **基调关系**: 侧边栏复用 background 色，激活项用 accent 背景 + primary 文字区分
- **关键状态**: 默认 muted-foreground → hover accent 背景 → 激活 primary 文字 + accent 背景，对比度 ≥ 4.5:1
- **边界与背景**: 右侧 1px border-border 分隔，非透明背景

### 2.3 语义颜色

| 用途       | Token              | HSL 值             | 衍生规则                     |
| ---------- | ------------------ | ------------------ | ---------------------------- |
| 低库存预警 | `destructive`      | hsl(0 72% 51%)     | 背景 hsl(0 72% 96%)，文字用深色变体 |
| 价格上涨   | `destructive`      | 同上               | 涨幅标签红底白字或红字浅红底 |
| 价格下降   | `success`          | hsl(152 55% 42%)   | 背景 hsl(152 55% 95%)        |
| AI置信度低 | `warning`          | hsl(38 92% 50%)    | 背景 hsl(38 92% 95%)，大字号可用 |
| 库存充足   | `success`          | 同价格下降         | 徽章绿色高亮                 |

## 3. Typography (字体排版)

- **Heading**: Inter, "Noto Sans SC", system-ui, sans-serif
- **Body**: Inter, "Noto Sans SC", system-ui, sans-serif
- **Mono/Data**: JetBrains Mono, "SF Mono", Consolas, monospace — 用于货号、价格、API Key、统计数据
- **字体策略**: 标题 font-bold/extrabold，正文 font-normal，数据字段强制等宽确保表格对齐；中文回退 Noto Sans SC

## 4. Layout Strategy (布局策略)

- **导航意图**: 应用概要设计已声明左侧侧边栏 + 顶部栏双轴导航，原样保留；至多一套全局导航
- **页面架构**: 侧边栏固定宽 240px + 顶部栏 56px + 主内容区 max-w-[1400px] 居中，内边距 p-6
- **响应式**: 移动端侧边栏折叠为抽屉，顶部栏保留语言切换与用户菜单；桌面端全展开

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-sm (2px)` · 阴影 `shadow-none`（卡片用 1px border 替代）· 间距基调 `compact (gap-3/p-4)`
- **识别签名**: 表格斑马纹 `odd:bg-accent/30` · 数据字段等宽字体 · 状态标签 pill 胶囊形 + 左侧小圆点
- **装饰策略**: 无装饰图形，用 1px 网格线、表格边框、代码风格输入框营造实验室精密感
- **动效原则**: 即时反馈 150ms ease-out，hover 背景渐变过渡，无弹窗动画
- **可及性**: 正文对比度 ≥ 4.5:1；低库存红底行文字用 hsl(0 72% 20%) 确保可读；交互元素有 focus ring

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Card/Table Row 覆盖 Default/Hover/Focus/Active/Disabled；Focus 环用 `ring-2 ring-primary/50`
- **层级清晰**: Primary 按钮填充 primary 色；Secondary/Ghost 用 outline 或 accent 背景；表单 Error 态边框 destructive + 下方提示
- **一致性**: 表格行高统一 h-10；卡片 padding p-4；标签 Badge 统一 rounded-full px-2 py-0.5 text-xs；颜色只用 Color System token

## 7. Image Direction (图片与视觉资产)

- **Image Role**: 无强制图片需求，优先通过排版、色彩和局部图形建立视觉记忆点
- **Image Art Direction**: 若登录页需背景氛围，采用抽象实验室玻璃器皿微距摄影风格，冷调蓝绿光，浅景深模糊
- **Image Prompt Keywords**: laboratory glassware macro, teal lighting, shallow depth of field, scientific minimalism, cool tones, frosted glass texture
- **Image Avoidance**: 避免卡通插画、通用商务人物、紫色/霓虹科技感、具象烧杯试管图标

## 8. 应避免 (Anti-patterns)

- ❌ 圆角超过 rounded-md(6px) — 破坏实验室精密锐利感
- ❌ 大面积渐变/毛玻璃效果 — 干扰数据阅读，违背 Grid 风格的克制原则
- ❌ 状态色脱离语义随意使用 — 红色仅限低库存/涨价，绿色仅限降价/充足，黄色仅限低置信度