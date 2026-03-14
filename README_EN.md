<div align="center">

# 🪐 LearningPhysics

**AI-Powered Adaptive Learning Platform for High School Physics**

[![GitHub Stars](https://img.shields.io/github/stars/guozongzhi/LearningPhysics?style=social)](https://github.com/guozongzhi/LearningPhysics/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/guozongzhi/LearningPhysics?style=social)](https://github.com/guozongzhi/LearningPhysics/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/guozongzhi/LearningPhysics)](https://github.com/guozongzhi/LearningPhysics/issues)
[![License](https://img.shields.io/github/license/guozongzhi/LearningPhysics)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.x-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

<h3>
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-development">Development</a> •
  <a href="#-contributors">Contributors</a> •
  <a href="#-license">License</a>
</h3>

[中文文档](./README.md) | [Deployment Guide](docs/arch/DEPLOYMENT_GUIDE.md) | [Architecture Docs](docs/arch/ARCHITECTURE.md)

</div>

---

## 📋 Overview

LearningPhysics is an open-source, AI-powered adaptive learning platform specifically designed for high school physics education. It combines **Knowledge Graphs** and **Generative AI** to provide intelligent assessment and personalized learning experiences, solving the long-standing problem of traditional exercise methods that only indicate correctness without explaining *why* an answer is wrong.

> **Core Philosophy**: Move beyond mere score calculation to provide deep, actionable insights into students' learning processes.

---

## ✨ Features

### 🧠 AI-Powered Intelligent Diagnosis
- **Accurate Error Cause Analysis**: Leverages large language models to identify root causes of mistakes (conceptual misunderstanding, calculation errors, unit conversion issues, etc.)
- **Chain-of-Thought Explanations**: Generates detailed, step-by-step reasoning for every question, mimicking guidance from an experienced physics teacher
- **Personalized Recommendations**: Provides targeted learning suggestions based on individual knowledge gaps
- **Multi-LLM Support**: Compatible with all OpenAI-compatible APIs (Doubao, OpenAI, Gemini, etc.)

### 📚 Comprehensive Knowledge Ecosystem
- **Complete Curriculum Coverage**: Includes mechanics, thermodynamics, optics, electromagnetism, and modern physics
- **Structured Knowledge Graph**: Organizes concepts according to national curriculum standards
- **High-Quality Question Bank**: Carefully curated questions with detailed solution steps and knowledge tagging
- **Rich Text Editor**: Supports creation of questions with complex formulas, charts, and multimedia content
- **Custom Topic Creation**: Allows users to create and share custom knowledge modules

### 🎨 Immersive User Experience
- **Cosmic Dark Theme**: Original physics-themed UI design with dynamic particle effects (projectile motion, pendulum, orbits, electromagnetic induction)
- **Fully Responsive**: Seamless experience across desktop, tablet, and mobile devices
- **Smooth Animation System**: Physics-inspired motion design and interactive transitions
- **Mobile Optimized**: Native-like touch gestures, card swiping, and haptic feedback
- **Built-in Whiteboard**: Online scratchpad for calculations and thought recording

### 🔧 Enterprise-Grade Management
- **Comprehensive Admin Panel**: Supports question bank management, user management, permission assignment, and data statistics
- **API Token Management**: Supports third-party application integration and API access control
- **Security First**: JWT authentication, input sanitization, and rate limiting
- **Containerized Deployment**: Full Docker architecture for one-click deployment and horizontal scaling
- **Data Export**: Supports export and analysis of learning data and diagnostic reports

---

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐    SQL     ┌───────────────┐
│   Next.js 16    │ ◄──────────────► │   FastAPI 0.110 │ ◄─────────► │ PostgreSQL 16 │
│   (Frontend)    │                  │    (Backend)    │            │   (Database)  │
└─────────────────┘                  └─────────────────┘            └───────────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│ Tailwind CSS    │                  │    LLM Engine   │
│ Framer Motion   │                  │ (OpenAI/Doubao) │
│ shadcn/ui       │                  └─────────────────┘
└─────────────────┘
```

### Technology Stack

**Frontend**:
- Next.js 16 (App Router) with Turbopack
- React 19 + TypeScript
- Tailwind CSS + Framer Motion
- shadcn/ui + Radix UI
- Zustand (State Management)
- KaTeX (Formula Rendering)
- Built-in whiteboard and rich text editor

**Backend**:
- FastAPI (Async Python)
- SQLModel + SQLAlchemy ORM
- PostgreSQL 16 with pgvector
- JWT Authentication
- OpenAI SDK for LLM integration

---

## 🚀 Quick Start

### Prerequisites
- Docker Engine >= 24.0
- Docker Compose >= 2.20
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/guozongzhi/LearningPhysics.git
   cd LearningPhysics
   ```

2. **Configure environment variables**
   Create configuration files in the `config/` directory:
   ```bash
   # Backend configuration
   cp config/backend.env.example config/backend.env
   # Frontend configuration
   cp config/frontend.env.example config/frontend.env
   ```

   Edit `config/backend.env` to add your LLM API credentials:
   ```env
   OPENAI_API_KEY=your-api-key-here
   OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
   OPENAI_MODEL=your-model-id
   ```

3. **Start the services**
   ```bash
   # Make the management script executable
   chmod +x manage.sh

   # Start production environment
   ./manage.sh prod
   ```
   > For local development, use `./manage.sh start` instead.

4. **Initialize the database**
   ```bash
   # Import default question bank and create admin account
   docker exec -it learningphysics_backend_prod python scripts/init_system.py
   docker exec -it learningphysics_backend_prod python scripts/import_questions.py data/questions.json
   ```

### Access Points

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Student Portal | http://localhost:3000 | Register new account |
| Admin Panel | http://localhost:3000/admin | `admin` / `admin123` |
| API Documentation | http://localhost:8000/docs | - |

> **Production Note**: When deploying to public networks, remember to change the default admin password and update the `SECRET_KEY` in your environment variables to a random string.

---

## 📖 Documentation

- [Deployment Guide](docs/arch/DEPLOYMENT_GUIDE.md) - Detailed production deployment instructions
- [Architecture Documentation](docs/arch/ARCHITECTURE.md) - System design and technical specifications
- [API Documentation](docs/design/API_FLOW.md) - REST API design and workflow
- [Data Model](docs/design/DATAMODEL.md) - Database schema and knowledge graph structure

---

## 🛠️ Development

### Setting Up Development Environment

1. **Frontend Development**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend Development**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

### Code Standards
- **Python**: Follow PEP 8, use Ruff for linting and Black for formatting
- **TypeScript**: Follow ESLint configuration, use Prettier for formatting
- **Commits**: Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)

---

## 👥 Contributors

Thanks to all the developers who have contributed to LearningPhysics!

<a href="https://github.com/guozongzhi/LearningPhysics/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=guozongzhi/LearningPhysics" />
</a>

We welcome all forms of contributions from the community! Whether you're reporting bugs, submitting new features, improving documentation, or sharing custom questions and topics, your input is incredibly valuable.

Please read our [Contribution Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

If you find this project helpful, please consider giving it a Star ⭐️ to show your support!

---

<div align="center">
Built with ❤️ for the future of physics education
</div>
