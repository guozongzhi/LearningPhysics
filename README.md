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
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

<h3>
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</h3>

</div>

---

## 📋 Overview

LearningPhysics is an open-source, AI-powered adaptive learning platform specifically designed for high school physics education. It combines **Knowledge Graphs** and **Generative AI** to provide intelligent assessment and personalized learning experiences, solving the long-standing problem of traditional "brute-force" exercise methods that only indicate correctness without explaining *why* an answer is wrong.

> **Core Philosophy**: Moving beyond mere score calculation to provide deep, actionable insights into students' learning processes.

---

## ✨ Features

### 🧠 AI-Powered Intelligent Diagnosis
- **Error Cause Analysis**: Leverages large language models to identify the root cause of mistakes (conceptual misunderstanding, calculation errors, unit conversion issues, etc.)
- **Chain-of-Thought Explanations**: Generates detailed, step-by-step reasoning for every question, mimicking the guidance of an experienced physics teacher
- **Personalized Recommendations**: Provides targeted learning suggestions based on individual student's knowledge gaps
- **Multi-LLM Support**: Compatible with all OpenAI-compatible APIs (Doubao, OpenAI, Gemini, etc.)

### 📚 Comprehensive Knowledge Base
- **Complete High School Curriculum Coverage**: Includes mechanics, thermodynamics, optics, electromagnetism, and modern physics
- **Structured Knowledge Graph**: Organizes concepts and relationships according to national curriculum standards
- **High-Quality Question Bank**: Carefully curated questions with detailed solution steps and knowledge point tagging
- **LaTeX Support**: Native KaTeX integration for perfect rendering of complex mathematical formulas and physical symbols

### 🎨 Modern User Experience
- **Immersive Dark Theme**: Professionally designed "Cosmic Dark" UI with physics-themed dynamic elements
- **Fully Responsive**: Seamless experience across desktop, tablet, and mobile devices
- **Smooth Animations**: Physics-inspired motion design and interactive feedback
- **Touch Optimized**: Native-like touch interactions and gesture support on mobile devices

### 🛠️ Production-Ready Architecture
- **Containerized Deployment**: Full Docker support for one-click deployment
- **Horizontal Scalability**: Stateless backend design supports high concurrency
- **Comprehensive Admin Panel**: Built-in management interface for question bank, users, and system configuration
- **Security First**: JWT authentication, input sanitization, and secure API design

---

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐    SQL     ┌───────────────┐
│   Next.js 16    │ ◄──────────────► │   FastAPI 0.110 │ ◄─────────► │ PostgreSQL 16 │
│  (Frontend)     │                  │   (Backend)     │            │   (Database)  │
└─────────────────┘                  └─────────────────┘            └───────────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│ Tailwind CSS    │                  │   LLM Engine    │
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

**Backend**:
- FastAPI (Async Python)
- SQLModel + SQLAlchemy ORM
- PostgreSQL 16 with pgvector
- JWT Authentication
- OpenAI SDK (LLM Integration)

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

### Access the Application

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Student Portal | http://localhost:3000 | Register new account |
| Admin Panel | http://localhost:3000/admin | `admin` / `admin123` |
| API Documentation | http://localhost:8000/docs | - |

> **Note**: For production deployment, remember to change the default admin password and update the `SECRET_KEY` in your environment variables.

---

## 📖 Documentation

- [Deployment Guide](docs/arch/DEPLOYMENT_GUIDE.md) - Detailed instructions for production deployment
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

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is greatly appreciated.

Please read our [Contribution Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

### Ways to Contribute
- 🐛 Report bugs and suggest features by opening issues
- 📝 Improve documentation and translations
- 🎨 Enhance UI/UX design and animations
- 📚 Add more questions to the question bank
- 🔧 Submit pull requests for bug fixes and new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Thanks to all contributors who have helped improve this project
- Inspired by the open-source education community
- Built with modern open-source tools and frameworks

---

<div align="center">
Made with ❤️ for physics education
</div>
