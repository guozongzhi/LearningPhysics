# 技术规范说明书 (TECH_SPEC.md)

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