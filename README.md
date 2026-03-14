<div align="center">

# 🪐 LearningPhysics

**高中物理 AI 自适应学习与精准诊断平台**

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Status](https://img.shields.io/badge/Status-Stable-blue)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

> *不仅是刷题，更是诊断。基于知识图谱与生成式 AI (GenAI) 的下一代物理辅助学习系统。*

[部署指南](docs/arch/DEPLOYMENT_GUIDE.md) | [架构文档](docs/arch/ARCHITECTURE.md)

</div>

---

## 📖 项目简介 (Introduction)

**LearningPhysics** 旨在解决传统题海战术“只知对错，不知归因”的痛点。本项目专注于高中物理学科，结合 **知识图谱 (Knowledge Graph)** 和 **生成式 AI 模型 (GenAI)**，实现智能化测评与自适应学习。

通过精巧的数学模型提取底层物理规律，它能够：
1. **精准归因诊断**: 识别学生错误的真正源头（例如：是“概念混淆”、“单位换算失误”还是“受力分析忽略了摩擦力”）。
2. **多维度能力剖析**: 相比传统的干瘪对号和红叉，AI 会像金牌教练一样，对每一次提交进行思维层面的 Chain-of-Thought (CoT) 解析。
3. **个性化学习路径**: 根据学生的薄弱知识点，智能推荐针对性的练习和学习建议。

---

## ✨ 核心特性 (Features)

* **🧠 智能大模型诊断 (Powered by Doubao / OpenAI / Gemini)**
  * 深度解析错因，自动为学生生成详尽的“解题思维链”，不仅告诉你“错了”，更告诉你“怎么错的”。
  * 支持所有兼容OpenAI接口的大模型服务，配置灵活。
* **📚 高质量物理题库与知识图谱**
  * 内置力学、热学、光学、电磁学与近代物理等多个核心板块，覆盖高中物理全部知识点。
  * 前端深度集成 KaTeX，提供无损、极其优雅的数学公式与各类复杂物理符号渲染。
* **🎨 宇宙级沉浸式 UI (Cosmic Dark Theme)**
  * 极具质感的极暗全宇宙（Cosmic Dark）响应式界面，适配桌面端和移动端。
  * 内嵌数十种物理元素的动态 SVG 粒子系统（抛体运动、单摆、引力轨道、电磁感应），在极客风格中汲取学习灵感。
  * 移动端优化：卡片支持水平滑动、触摸反馈动画，操作流畅自然。
* **🛠️ 一站式极简运维 (Managing Made Easy)**
  * 利用 `docker-compose` 和统一环境管理脚本 `manage.sh`，实现极速一键拉起、数据注入与热更部署。
  * 内置完善的管理后台，支持题库管理、用户管理、数据统计等功能。

---

## 🛠️ 技术栈 (Tech Stack)

### 前端 (Frontend)
- **框架**: Next.js 16 (App Router), React 19
- **样式**: Tailwind CSS (支持高度定制的动画体系与响应式断点)
- **组件库**: Radix UI, shadcn/ui, Framer Motion
- **状态管理**: Zustand
- **渲染引擎**: KaTeX (用于 LaTeX 物理公式)
- **构建工具**: Turbopack

### 后端 (Backend)
- **核心框架**: FastAPI (全异步非阻塞)
- **ORM & DB**: SQLModel, SQLAlchemy, PostgreSQL 16
- **状态 & 认证**: JWT Auth, Passlib
- **AI 引擎对接**: 兼容 OpenAI 格式的各类大模型 API（字节跳动豆包、OpenAI、Google Gemini 等）
- **数据库迁移**: 自定义迁移脚本，支持平滑版本升级

---

## 🚀 快速启动 (Quick Start)

本项目依托于 `docker` 实现了全容器化运行。只需一行脚本即可在任何环境下一键启动。

### 1. 环境准备
确保您的本机或服务器已安装 [Docker](https://www.docker.com/) 与 `docker-compose`。

### 2. 克隆项目
```bash
git clone https://github.com/guozongzhi/LearningPhysics.git
cd LearningPhysics
```

### 3. 配置环境变量
在 `config/` 目录下创建配置文件：
```bash
# 后端配置
cp config/backend.env.template config/backend.env
# 前端配置
cp config/frontend.env.template config/frontend.env
```

> **重要**：您需要在 `config/backend.env` 中配置您的 `OPENAI_API_KEY` 及对应的 `OPENAI_BASE_URL`、`OPENAI_MODEL`，以便系统可以调用大模型进行题目解析诊断。

### 4. 初始化与启动服务
我们的根目录下提供了一个统一的运维管家控制台 `manage.sh`。

```bash
# 赋予执行权限
chmod +x manage.sh

# 生产部署：一键构建镜像并拉起服务（后台运行）
./manage.sh prod
```

> `./manage.sh start` / `restart` / `status` / `diagnose` / `init` 仅用于本地开发调试；服务器生产部署请使用 `./manage.sh prod`。

### 5. 加载出厂知识图谱与题库
如果是第一次运行，您需要向数据库中导入默认的高中物理测试题库：
```bash
# 进入后端容器内初始化题目
docker exec -it learningphysics_backend_prod python scripts/init_system.py
docker exec -it learningphysics_backend_prod python scripts/import_questions.py data/questions.json
```

---

## 📡 访问入口

启动成功后，您可以在浏览器中访问以下服务：
- **前台学生中心**: `http://localhost:3000`
  - 注册后即可生成测验，进行 AI 分析。
- **后台管理平台**: `http://localhost:3000/admin`
  - 默认管理员账号：`admin`，默认密码：`admin123`（生产环境请立即修改）
  - 可在此处管理题库、配置 AI 及导出诊断记录。
- **API Swagger 文档**: `http://localhost:8000/docs`

> 如果您部署在云服务器，请将 `localhost` 替换为相应的公网 IP，并在 `config/frontend.env` 里面配置正确的 `NEXT_PUBLIC_API_URL` 跨域源。

---

## 🤝 参与贡献 (Contributing)

我们非常欢迎且渴望开源社区的各方力量加入，一起打造改变下一代教育的物理平台！
请先阅读 [贡献指南](CONTRIBUTING.md) 和 [行为准则](CODE_OF_CONDUCT.md) 了解参与方式。

无论是增补题库、修复 Bug，还是提供更好看的高级物理动画 SVG，我们都感激不尽。

---

## 📄 开源许可证 (License)

本项目基于 [MIT License](LICENSE) 协议开源。欢迎自由分发和修改使用。
如果有任何部署和使用疑问，欢迎在 GitHub 提交 Issue。
