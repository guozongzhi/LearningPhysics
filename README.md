# LearningPhysics - 高中物理 AI 自适应学习平台

![Status](https://img.shields.io/badge/Status-In%20Development-blue)
![Tech](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20PostgreSQL-green)
![AI](https://img.shields.io/badge/AI-RAG%20%2B%20Knowledge%20Graph-purple)

> **不仅是刷题，更是诊断。**
> 基于知识图谱与生成式 AI (GenAI) 的下一代物理辅助学习系统。

---

## 📖 项目简介 (Introduction)

**LearningPhysics** 旨在解决传统题海战术“只知对错，不知归因”的痛点。本项目专注于高中物理学科，结合 **知识图谱 (Knowledge Graph)** 和 **向量检索 (RAG)** 技术，实现两大核心功能：

1.  **精准归因诊断:** 识别错误源头是“概念混淆”、“计算失误”还是“模型未建立”。
2.  **动态自适应路径:** 根据学生的实时掌握度 (Knowledge Tracing)，动态调整题目难度与考察点。

---

## 🚀 快速启动 (Quick Start)

现在所有操作都通过根目录下的统一管理脚本 `./manage.sh` 完成。

1. **环境准备**: 确保已安装 Docker, Node.js 和 Python 3。
2. **初始化系统**: 运行 `./manage.sh init` (创建数据库、导入题库)。
3. **启动服务**: 运行 `./manage.sh start`。
4. **系统诊断**: 运行 `./manage.sh diagnose` 检查运行状态。

详细指南请参考: [部署与管理指南](docs/arch/DEPLOYMENT_GUIDE.md)

---

## 📂 项目结构 (Structure)

```text
LearningPhysics/
├── docs/                      # [核心] 项目文档与设计说明
│   ├── design/                # AI 设计上下文与技术方案
│   ├── arch/                  # 系统架构、部署指南与总结
│   └── debug/                 # 调试记录与问题解决方案
├── backend/                   # FastAPI 后端实现
├── frontend/                  # Next.js 前端实现
├── data/                      # 静态资源 (题库 JSON 等)
├── config/                    # 环境变量配置文件
├── manage.sh                  # 统一管理脚本 (Entry Point)
└── README.md
```

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