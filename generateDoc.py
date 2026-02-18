import os

# 定义目录结构
CONTEXT_DIR = ".ai_context"
FILES = {}

# 1. TECH_SPEC.md
FILES[os.path.join(CONTEXT_DIR, "TECH_SPEC.md")] = """# 技术规范说明书 (TECH_SPEC.md)

## 1. 后端技术栈 (Python)
- **框架:** FastAPI (最新版, 原生异步)。
- **Python 版本:** 3.11+。
- **数据库 ORM:** SQLModel (SQLAlchemy + Pydantic 的封装)。
- **数据库驱动:** `asyncpg` (异步 PostgreSQL 必选)。
- **向量扩展:** `pgvector` (必须使用 `pgvector-python` 库)。
- **AI/大模型:** `openai` (v1.0+) 或 `langchain`。
- **依赖管理:** `poetry` 或 `pip` (标准的 `requirements.txt`)。
- **代码检查/格式化:** `ruff` (首选) 或 `black` + `isort`。

## 2. 前端技术栈 (TypeScript)
- **框架:** Next.js 14+ (App Router 模式, 使用 `src/` 目录)。
- **语言:** TypeScript (严格模式 Strict mode)。
- **样式:** Tailwind CSS (v3.4+)。
- **UI 组件库:** Shadcn UI (基于 Radix Primitives + Tailwind)。
- **图标库:** `lucide-react`。
- **状态管理:** `zustand` (避免使用 Redux)。
- **数据获取:** `tanstack-query` (React Query) v5 或对于简单 MVP 使用标准 `fetch`。
- **数学公式渲染:** `react-katex` (必须引入 CSS)。

## 3. 编码规范 (必须遵守)
- **异步优先:** 所有 I/O 密集型操作 (数据库, API 调用) 必须使用 `async/await`。
- **类型安全:**
    - Python: 使用 `typing.List`, `typing.Optional`, `typing.Dict`。所有 API Schema 必须使用 Pydantic 模型。
    - TypeScript: 严禁使用 `any`。为所有 Props 和 API 响应定义接口 (Interfaces)。
- **错误处理:**
    - 后端: 抛出带有清晰详细信息的 `HTTPException`。
    - 前端: 使用 `try/catch` 块，并通过 `toast` 组件显示通知 (使用 `sonner` 或 `react-hot-toast`)。
- **注释:** 为所有 Python 函数添加文档字符串 (Docstrings)，解释 *参数 (Args)*, *返回值 (Returns)*, 和 *异常 (Raises)*。
- **配置:** 所有敏感信息 (DB_URL, OPENAI_KEY) 必须通过 `pydantic-settings` 读取 `.env` 文件。

## 4. 目录结构强制要求
```text
/backend
  /app
    /api (v1 路由层)
    /core (配置, 安全设置)
    /models (sqlmodel 类定义)
    /services (业务逻辑层)
    /db (数据库会话管理)
/frontend
  /src
    /app (页面路由)
    /components (UI组件, 专用组件)
    /lib (工具函数, API 客户端)
    /store (zustand 状态库)
```
"""

# 2. DATAMODEL.md
FILES[os.path.join(CONTEXT_DIR, "DATAMODEL.md")] = """# 数据模型规范 (DATAMODEL.md)

所有定义均需使用 **SQLModel**。

## 1. 必需的导入
```python
from typing import Optional, List, Dict
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime
```

## 2. 表结构定义

### `KnowledgeNode` (知识点树状结构)
- **id**: `int` (主键, 自增)
- **name**: `str` (索引=True)
- **code**: `str` (唯一, 例如: "MECH-001")
- **description**: `Optional[str]` (描述)
- **parent_id**: `Optional[int]` (外键指向 `knowledge_nodes.id`)
- **level**: `int` (1=单元, 2=章节, 3=考点)

### `Question` (核心题目表)
- **id**: `uuid.UUID` (主键, 默认值=`uuid4`)
- **content_latex**: `str` (题目正文, Markdown + LaTeX 格式)
- **difficulty**: `int` (1-5)
- **primary_node_id**: `int` (外键指向 `knowledge_nodes.id`)
- **question_type**: `str` (枚举: "CHOICE", "BLANK", "CALCULATION")
- **embedding**: `List[float]`
    - **实现注意:** 必须使用 `sa_column=Column(Vector(1536))` 以适配 OpenAI Embeddings。
- **answer_schema**: `Dict`
    - **实现注意:** 必须使用 `sa_column=Column(JSONB)`。
    - **结构示例:**
      ```json
      {
        "type": "value_unit", 
        "correct_value": 10.5, 
        "unit": "m/s", 
        "tolerance": 0.05 
      }
      ```
- **solution_steps**: `str` (完整解析, Markdown + LaTeX 格式)

### `UserMastery` (学生状态表)
- **user_id**: `uuid.UUID` (外键指向 `users.id`)
- **node_id**: `int` (外键指向 `knowledge_nodes.id`)
- **mastery_score**: `float` (0.0 到 1.0)
- **last_updated**: `datetime`
- **主键:** 复合主键 (`user_id`, `node_id`)

### `ExamRecord` (答题记录表)
- **id**: `uuid.UUID` (主键)
- **user_id**: `uuid.UUID`
- **question_id**: `uuid.UUID`
- **student_input**: `str`
- **is_correct**: `bool`
- **ai_analysis**: `Dict` (JSONB)
    - 存储 LLM 生成的完整分析，解释学生为什么错了。
"""

# 3. DOMAIN_KNOWLEDGE.md
FILES[os.path.join(CONTEXT_DIR, "DOMAIN_KNOWLEDGE.md")] = """# 领域知识与种子数据 (DOMAIN_KNOWLEDGE.md)

## 1. 物理学科上下文
- **单位至关重要:** 在物理学中，没有单位的数字通常是错误的。系统必须验证单位 (例如: `N`, `m/s^2`, `J`)。
- **LaTeX 格式规范:**
    - 行内公式: `$ ... $` (例如: $F = ma$)
    - 块级公式: `$$...$$`
    - 矢量符号: `\\vec{v}`
    - 分数: `\\frac{a}{b}`
    - 单位: 推荐使用 `\\mathrm{kg}` (正体) 而非斜体 `kg`。
- **认知诊断逻辑:**
    - 错误通常不是随机的，而是源于：
        1. **概念错误:** 用错了公式 (例如: 动能公式用成了 $E_k = mv$ 而不是 $1/2 mv^2$)。
        2. **计算错误:** 数学运算失误。
        3. **单位错误:** 忘记将 cm 转换为 m。

## 2. 种子数据示例 (用于填充数据库)

### 示例 1: 力学 (牛顿第二定律)
```json
{
  "content_latex": "如图所示，质量为 $m=2\\,\\mathrm{kg}$ 的物体静止在光滑水平面上。现对物体施加一个水平方向的恒力 $F=10\\,\\mathrm{N}$。求物体加速度 $a$ 的大小。",
  "difficulty": 2,
  "question_type": "CALCULATION",
  "primary_node_code": "NEWTON-LAW-2",
  "answer_schema": {
    "type": "value_unit",
    "correct_value": 5.0,
    "unit": "m/s^2",
    "tolerance": 0.1
  },
  "solution_steps": "根据牛顿第二定律: $$F = ma$$ $$a = \\frac{F}{m} = \\frac{10}{2} = 5\\,\\mathrm{m/s^2}$$"
}
```

### 示例 2: 电磁学 (洛伦兹力)
```json
{
  "content_latex": "一个质子以速度 $v = 3 \\times 10^6\\,\\mathrm{m/s}$ 垂直射入磁感应强度为 $B = 0.5\\,\\mathrm{T}$ 的匀强磁场中。计算质子受到的洛伦兹力大小。(质子电荷量 $q \\approx 1.6 \\times 10^{-19}\\,\\mathrm{C}$)",
  "difficulty": 3,
  "question_type": "CALCULATION",
  "primary_node_code": "LORENTZ-FORCE",
  "answer_schema": {
    "type": "value_unit",
    "correct_value": 2.4e-13,
    "unit": "N",
    "tolerance": 1e-14
  },
  "solution_steps": "洛伦兹力公式: $$F = qvB$$ 代入数值计算..."
}
```
"""

# 4. API_FLOW.md
FILES[os.path.join(CONTEXT_DIR, "API_FLOW.md")] = """# API 接口契约 (API_FLOW.md)

所有接口前缀均为 `/api/v1`。

## 1. 组卷流程 (Quiz Generation Flow)

**接口地址:** `POST /quiz/generate`

**请求参数 (Request):**

```json
{
  "topic_ids": [101, 102],
  "difficulty_preference": "adaptive", 
  "count": 5
}
```

**业务逻辑:**

1.  **检索:** 获取与 `topic_ids` 匹配的题目。
2.  **过滤:** 根据用户当前的掌握度过滤难度 (如果用户系统尚未就绪，使用模拟逻辑)。
3.  **抽取:** 随机选择 `count` 道题目。

**响应结果 (Response):**

```json
{
  "quiz_id": "uuid",
  "questions": [
    {
      "id": "uuid",
      "content_latex": "...",
      "type": "CALCULATION"
      // 注意: 此时不向客户端发送 answer_schema (防止作弊)!
    }
  ]
}
```

## 2. 提交与分析流程 (Submission & Analysis Flow)

**接口地址:** `POST /quiz/submit`

**请求参数 (Request):**

```json
{
  "quiz_id": "uuid",
  "answers": [
    {
      "question_id": "uuid-1",
      "student_input": "5 m/s",
      "time_spent_ms": 12000
    }
  ]
}
```

**响应结果 (Response):**

```json
{
  "total_score": 80,
  "analysis": {
    "uuid-1": {
      "is_correct": false,
      "feedback": "数值正确，但单位错误。加速度的单位应该是 m/s^2。",
      "error_tag": "UNIT_ERROR"
    }
  }
}
```
"""

# 5. UI_DESIGN.md
FILES[os.path.join(CONTEXT_DIR, "UI_DESIGN.md")] = """# UI/UX 设计指南 (UI_DESIGN.md)

## 1. 视觉风格
- **主题:** "学术专业风" (Academic Professional)。整洁、无干扰。
- **调色板:**
    - 主色: Slate-900 (深蓝灰)
    - 强调色: Indigo-600
    - 成功色: Emerald-600
    - 错误色: Rose-600
    - 背景色: Slate-50 (类纸质的米白色)
- **排版:** UI 使用 Inter (Sans)，数学公式使用 'Times New Roman' 或 'Computer Modern' 字体。

## 2. 组件需求 (React/Shadcn)

### 答题界面 (双栏布局)
- **布局:** 桌面端两栏布局 (50/50)。
    - **左侧面板 (题目):** - 可滚动。
        - 使用 `<Latex>` 组件完美渲染数学公式。
        - 显示难度徽章 (Badges)。
    - **右侧面板 (工作区):**
        - 固定位置。
        - 答案输入框。
        - 底部包含 "提交" 按钮。
        - 移动端适配: 堆叠布局 (题目在上, 答题区在下)。

### 分析报告界面
- **卡片式布局:** 每道题的结果展示在一个独立的卡片中。
- **手风琴交互:** 点击展开 "AI 深度解析" 详情。
- **可视化:** 使用 `recharts` 展示本次练习后的能力雷达图 (Radar Chart)。

## 3. 交互细节
- **输入框:** 针对物理题，输入框应允许输入文本，并在可能的情况下提供单位建议。
- **加载状态:** 在等待 AI 分析生成时，使用骨架屏 (Skeleton/Shimmer effect)。
"""

# 6. README.md (放在根目录)
FILES["README.md"] = """# LearningPhysics - 高中物理 AI 自适应学习平台

![Status](https://img.shields.io/badge/Status-In%20Development-blue)
![Tech](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20PostgreSQL-green)
![AI](https://img.shields.io/badge/AI-RAG%20%2B%20Knowledge%20Graph-purple)

> **不仅是刷题，更是诊断。** > 基于知识图谱与生成式 AI (GenAI) 的下一代物理辅助学习系统。

---

## 📖 项目简介 (Introduction)

**LearningPhysics** 旨在解决传统题海战术“只知对错，不知归因”的痛点。本项目专注于高中物理学科，结合 **知识图谱 (Knowledge Graph)** 和 **向量检索 (RAG)** 技术，实现两大核心功能：

1.  **精准归因诊断:** 识别错误源头是“概念混淆”、“计算失误”还是“模型未建立”。
2.  **动态自适应路径:** 根据学生的实时掌握度 (Knowledge Tracing)，动态调整题目难度与考察点。

---

## 🌟 核心功能 (Features)

* **🧠 智能组卷 (Smart Quiz Generation)**
    * 基于 IRT (项目反应理论) 的难度匹配。
    * 混合检索：结合知识点标签过滤与向量语义搜索。
* **🕵️‍♂️ 深度错题分析 (Deep Error Analysis)**
    * **Chain-of-Thought (CoT)**: AI 像金牌教练一样逐步拆解解题步骤。
    * **多维归因**: 区分数值错误、单位错误、受力分析漏力等物理特有错误。
* **📊 知识雷达 (Knowledge Radar)**
    * 基于 `pgvector` 的实时能力追踪。
    * 可视化展示力学、电磁学等模块的掌握程度。
* **⚡ 沉浸式刷题体验**
    * 完美支持 LaTeX 公式渲染 (KaTeX)。
    * 无干扰的“学术风” UI 设计。

---

## 🏗 系统架构 (Architecture)

采用 **Modular Monolith (模块化单体)** 架构，便于开发与后期微服务拆分。

```mermaid
graph TD
    Client[Web Client (Next.js)] <--> API[API Gateway (FastAPI)]
    
    subgraph "Backend Service"
        API --> QuizSvc[组卷服务]
        API --> AnalysisSvc[AI 分析服务]
        API --> UserSvc[用户能力追踪]
    end
    
    subgraph "Data Storage"
        QuizSvc <--> DB[(PostgreSQL)]
        AnalysisSvc <--> VectorDB[(pgvector)]
        DB -.->|Schema| KnowledgeNodes[知识图谱]
    end
    
    subgraph "AI Core"
        AnalysisSvc --> LLM[LLM (OpenAI/Gemini)]
        QuizSvc --> Embedding[Embedding Model]
    end
```

### 技术栈选型

| 模块 | 技术 | 说明 |
| :--- | :--- | :--- |
| **前端** | **Next.js 14+** | App Router, TypeScript, Tailwind CSS, Shadcn UI |
| **后端** | **FastAPI** | Python 3.11+, Async Native, Pydantic |
| **数据库** | **PostgreSQL** | 关系数据 + **pgvector** (向量存储) |
| **ORM** | **SQLModel** | 结合 SQLAlchemy 与 Pydantic 的最佳实践 |
| **AI/LLM** | **OpenAI / LangChain** | 错题归因与变式题生成 |
| **部署** | **Docker Compose** | 本地全栈环境一键拉起 |

---

## 📂 项目结构 (Structure)

```text
LearningPhysics/
├── .ai_context/               # [核心] AI 辅助开发的上下文文件 (Prompt Context)
├── backend/                   # FastAPI 后端
│   ├── app/
│   │   ├── models/            # SQLModel 定义 (含 pgvector)
│   │   ├── services/          # 业务逻辑 (LLM Chain, 评分算法)
│   │   └── api/               # RESTful Endpoints
│   └── tests/
├── frontend/                  # Next.js 前端
│   ├── src/
│   │   ├── components/latex/  # 公式渲染组件
│   │   └── app/               # 页面路由
├── docker/                    # 数据库初始化脚本
└── README.md
```
"""

def generate_files():
    # 创建 .ai_context 目录
    if not os.path.exists(CONTEXT_DIR):
        os.makedirs(CONTEXT_DIR)
        print(f"Created directory: {CONTEXT_DIR}")
    
    # 写入文件
    for filepath, content in FILES.items():
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content.strip())
            print(f"✅ Generated: {filepath}")
        except Exception as e:
            print(f"❌ Error generating {filepath}: {e}")

    print("\n🎉 All context files generated successfully!")
    print("   Run your AI agent command now:")
    print('   claude "Read files in .ai_context/ and initialize the backend..."')

if __name__ == "__main__":
    generate_files()