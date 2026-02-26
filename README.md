# LearningPhysics - 高中物理 AI 自适应学习平台

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

## 🚀 本地开发环境搭建 (Local Development Setup)

本项目依赖一个配置了 `pgvector` 扩展的 PostgreSQL 数据库。推荐使用 Docker 进行快速搭建。

**1. 启动数据库:**

在项目根目录下，我们提供了一个 `docker-compose.yml` 文件。请确保您已经安装了 Docker。在根目录下运行：

```bash
docker-compose up -d
```

该命令会启动一个 PostgreSQL 16 的容器，并自动创建名为 `learningphysics` 的数据库和启用 `pgvector` 扩展。

**2. 配置后端环境变量:**

后端服务依赖于 OpenAI API 来提供 AI 分析功能。

- 进入 `backend` 目录。
- 创建一个名为 `.env` 的新文件: `touch .env`
- 在 `.env` 文件中添加您的 OpenAI API 密钥，格式如下:
  ```
  OPENAI_API_KEY="sk-..."
  ```

**3. 安装后端依赖:**

```bash
# 进入后端目录
cd backend

# (推荐) 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

**4. 初始化并填充数据库:**

首次启动时，需要创建表结构并填充初始数据（包括生成向量嵌入）。

```bash
# 确保在 backend 目录下
python3 seed_db.py
```

**5. 启动后端服务:**

```bash
# 确保在 backend 目录下
uvicorn main:app --reload
```

后端服务将在 `http://localhost:8000` 上运行。

**6. 启动前端服务:**

前端应用提供了用户交互界面。

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 `http://localhost:3000` 上运行。


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