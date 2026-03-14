<div align="center">

# 🪐 LearningPhysics

**高中物理 AI 自适应学习与精准诊断平台**

[![GitHub Stars](https://img.shields.io/github/stars/guozongzhi/LearningPhysics?style=social)](https://github.com/guozongzhi/LearningPhysics/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/guozongzhi/LearningPhysics?style=social)](https://github.com/guozongzhi/LearningPhysics/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/guozongzhi/LearningPhysics)](https://github.com/guozongzhi/LearningPhysics/issues)
[![License](https://img.shields.io/github/license/guozongzhi/LearningPhysics)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.x-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

<h3>
  <a href="#-核心特性">核心特性</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-系统架构">系统架构</a> •
  <a href="#-开发指南">开发指南</a> •
  <a href="#-贡献者">贡献者</a> •
  <a href="#-开源许可证">开源许可证</a>
</h3>

[English Documentation](./README_EN.md) | [部署指南](docs/arch/DEPLOYMENT_GUIDE.md) | [架构文档](docs/arch/ARCHITECTURE.md)

</div>

---

## 📋 项目简介

LearningPhysics 是一款开源的 AI 自适应学习平台，专为高中物理教育打造。项目结合 **知识图谱** 和 **生成式大模型**，提供智能化测评与个性化学习体验，解决传统题海战术"只知对错、不知归因"的核心痛点。

> **核心理念**：超越单纯的分数计算，深入洞察学生的学习过程，提供可落地的针对性提升方案。

---

## 📸 项目截图

| 功能模块 | 预览效果 |
|---------|---------|
| **主页与知识卡片** | [主页](screenshots/homepage.png) |
| **答题与AI解析** | [答题界面](screenshots/quiz.png) |
| **诊断报告页面** | [诊断报告](screenshots/report.png) |
| **单题AI分析报告** | [单题分析报告](screenshots/question_analysis.png) |
| **管理员登录界面** | [管理员登录](screenshots/admin_login.png) |
| **管理后台** | [管理后台](screenshots/admin.png) |
| **移动端适配** | [移动端](screenshots/mobile.png) |

> 截图存放于 `screenshots/` 目录，替换对应文件即可自动更新。

---

## ✨ 核心特性

### 🧠 AI 智能诊断引擎
- **错因精准识别**：基于大模型深度分析错误根源（概念混淆、计算失误、单位错误、受力分析遗漏等）
- **思维链级解析**：像金牌物理教师一样提供 step-by-step 的解题思路讲解
- **个性化学习路径**：根据知识掌握情况自动推荐针对性练习和学习建议
- **多模型兼容**：支持所有 OpenAI 协议兼容的大模型（字节豆包、OpenAI、Google Gemini 等）

### 📚 完整的知识生态
- **全知识点覆盖**：包含力学、热学、光学、电磁学、近代物理等全部高中物理内容
- **结构化知识图谱**：按照新课标要求组织知识点关联关系
- **高质量题库**：精心编制的试题库，附带详细解答步骤和知识点标签
- **富文本编辑器**：支持复杂公式、图表、多媒体内容的题目创作
- **用户自定义主题**：支持用户创建和分享自定义知识点模块

### 🎨 沉浸式用户体验
- **宇宙暗黑主题**：原创"宇宙级"物理主题 UI 设计，内置动态物理粒子特效（抛体运动、单摆、天体轨道、电磁感应）
- **全平台响应式**：完美适配桌面端、平板、手机等各类设备
- **流畅动画系统**：基于物理规律设计的交互动效和过渡动画
- **移动端优化**：支持触摸手势、卡片滑动、触觉反馈等原生级体验
- **内置白板功能**：提供在线草稿板，支持演算和思路记录

### 🔧 企业级管理能力
- **完善的管理后台**：支持题库管理、用户管理、权限分配、数据统计
- **API Token 管理**：支持第三方应用接入和 API 调用权限控制
- **安全可靠**：JWT 身份认证、输入安全校验、接口防刷限流
- **容器化部署**：全 Docker 架构，支持一键部署和水平扩展
- **数据导出**：支持学习数据、诊断报告的导出和分析

---

## 🏗️ 系统架构

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐    SQL     ┌───────────────┐
│   Next.js 16    │ ◄──────────────► │   FastAPI 0.110 │ ◄─────────► │ PostgreSQL 16 │
│  (前端应用)      │                  │   (后端服务)     │            │   (数据库)     │
└─────────────────┘                  └─────────────────┘            └───────────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│ Tailwind CSS    │                  │   大模型引擎      │
│ Framer Motion   │                  │ (豆包/OpenAI)    │
│ shadcn/ui       │                  └─────────────────┘
└─────────────────┘
```

### 技术栈

**前端技术栈**:
- Next.js 16 (App Router) + Turbopack
- React 19 + TypeScript
- Tailwind CSS + Framer Motion 动画系统
- shadcn/ui + Radix UI 组件库
- Zustand 状态管理
- KaTeX 公式渲染引擎
- 内置白板和富文本编辑器

**后端技术栈**:
- FastAPI 全异步 Python 框架
- SQLModel + SQLAlchemy ORM
- PostgreSQL 16 + pgvector 向量扩展
- JWT 认证体系
- OpenAI SDK 多模型接入

---

## 🚀 快速开始

### 环境要求
- Docker Engine >= 24.0
- Docker Compose >= 2.20
- Git

### 安装部署

1. **克隆项目代码**
   ```bash
   git clone https://github.com/guozongzhi/LearningPhysics.git
   cd LearningPhysics
   ```

2. **配置环境变量**
   在 `config/` 目录下创建配置文件：
   ```bash
   # 后端配置
   cp config/backend.env.example config/backend.env
   # 前端配置
   cp config/frontend.env.example config/frontend.env
   ```

   编辑 `config/backend.env`，填入大模型 API 配置：
   ```env
   OPENAI_API_KEY=你的API密钥
   OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
   OPENAI_MODEL=你的模型ID
   ```

3. **启动服务**
   ```bash
   # 赋予管理脚本执行权限
   chmod +x manage.sh

   # 生产环境一键启动
   ./manage.sh prod
   ```
   > 本地开发请使用 `./manage.sh start` 命令。

4. **初始化数据库**
   ```bash
   # 导入默认题库和创建管理员账号
   docker exec -it learningphysics_backend_prod python scripts/init_system.py
   docker exec -it learningphysics_backend_prod python scripts/import_questions.py data/questions.json
   ```

### 访问地址

| 服务 | 地址 | 默认账号 |
|------|------|----------|
| 学生端 | http://localhost:3000 | 注册新账号 |
| 管理后台 | http://localhost:3000/admin | `admin` / `admin123` |
| API 文档 | http://localhost:8000/docs | - |

> **生产环境注意**：部署到公网时请务必修改默认管理员密码，并更新配置文件中的 `SECRET_KEY` 为随机字符串。

---

## 📖 相关文档

- [部署指南](docs/arch/DEPLOYMENT_GUIDE.md) - 详细的生产环境部署教程
- [架构文档](docs/arch/ARCHITECTURE.md) - 系统设计与技术实现细节
- [API 文档](docs/design/API_FLOW.md) - REST API 设计与调用流程
- [数据模型](docs/design/DATAMODEL.md) - 数据库结构与知识图谱设计

---

## 🛠️ 开发指南

### 本地开发环境搭建

1. **前端开发**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **后端开发**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows 系统: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

### 代码规范
- **Python**: 遵循 PEP 8 规范，使用 Ruff 进行代码检查，Black 格式化
- **TypeScript**: 遵循 ESLint 配置，使用 Prettier 格式化
- **提交规范**: 使用约定式提交信息格式 (`feat:`, `fix:`, `docs:` 等)

---

## 👥 贡献者

感谢所有为 LearningPhysics 做出贡献的开发者！

<a href="https://github.com/guozongzhi/LearningPhysics/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=guozongzhi/LearningPhysics" />
</a>

我们欢迎社区的各种形式贡献！无论是报告 Bug、提交新功能、改进文档，还是分享自定义题目和主题，都非常有价值。

请先阅读 [贡献指南](CONTRIBUTING.md) 和 [行为准则](CODE_OF_CONDUCT.md) 了解参与方式。

---

## 📄 开源许可证

本项目采用 [MIT 许可证](LICENSE) 开源，欢迎自由使用、修改和分发。

如果这个项目对你有帮助，欢迎点个 Star ⭐️ 支持一下！

---

<div align="center">
用 ❤️ 打造下一代物理教育平台
</div>
