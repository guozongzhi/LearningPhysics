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
      /v1 (版本化API)
    /core (配置, 安全设置, 通用工具)
    /models (sqlmodel 类定义)
    /services (业务逻辑层)
    /db (数据库会话管理, 迁移脚本)
    /schemas (Pydantic 数据校验模型)
/frontend
  /src
    /app (页面路由 - Next.js App Router)
    /components (UI组件, 分为通用组件/ui和业务组件)
    /lib (工具函数, API 客户端, 通用hooks)
    /store (zustand 状态库)
    /types (TypeScript 类型定义)
```

---

## 5. 架构设计原则
### 5.1 前后端分离原则
- 前端只负责UI渲染和用户交互，所有业务逻辑都在后端实现
- API接口采用RESTful设计风格，保持无状态
- 前后端通过JSON格式进行数据交互

### 5.2 分层架构原则
- **路由层**: 仅负责请求参数校验、响应格式化、调用服务层
- **服务层**: 封装核心业务逻辑，可被多个路由复用
- **数据访问层**: 封装数据库操作，ORM层对外屏蔽SQL细节
- **核心层**: 通用工具、配置、安全等基础能力

### 5.3 可扩展性原则
- 功能模块独立，高内聚低耦合
- 接口设计预留扩展空间，避免破坏性变更
- 第三方依赖抽象，便于替换（如大模型服务、存储服务）

---

## 6. 测试规范
### 6.1 测试分层
1. **单元测试**: 覆盖核心业务逻辑（Service层、工具函数），覆盖率 ≥ 70%
2. **集成测试**: 测试API接口完整流程，覆盖主要业务场景
3. **E2E测试**: 端到端测试核心用户路径（登录、答题、查看报告等）
4. **AI功能测试**: 专门测试大模型输出的准确性和稳定性

### 6.2 测试工具
- 后端: pytest + httpx
- 前端: Jest + React Testing Library + Cypress (E2E)
- 性能测试: k6 + locust

### 6.3 测试流程
- 本地开发阶段必须运行单元测试
- PR合并前自动运行全量测试
- 生产发布前运行回归测试集

---

## 7. CI/CD 流程规范
### 7.1 分支管理
- `master`: 生产环境分支，保护分支，只能通过PR合并
- `develop`: 开发分支，日常开发合并到此分支
- `feature/*`: 功能分支，从develop checkout，开发完成后PR到develop
- `hotfix/*`: 紧急修复分支，从master checkout，修复完成后PR到master和develop

### 7.2 自动化流程
1. **PR提交**: 自动运行代码检查、单元测试、安全扫描
2. **合并到develop**: 自动部署到测试环境，运行集成测试
3. **合并到master**: 自动打标签，部署到预发环境，运行回归测试
4. **生产发布**: 手动触发，灰度发布，全量发布

### 7.3 代码审查要求
- 所有代码必须经过至少1人审查才能合并
- 代码审查重点：安全性、性能、可维护性、是否符合规范

---

## 8. 安全规范
### 8.1 认证授权
- 所有非公开API必须通过JWT认证
- 权限控制采用RBAC模型，按角色分配权限
- JWT Token有效期24小时，支持刷新Token
- 密码必须bcrypt加密存储，不可逆

### 8.2 输入验证
- 所有用户输入必须在API层进行严格校验
- 防止SQL注入：使用ORM，禁止拼接SQL
- 防止XSS攻击：前端渲染用户输入时进行转义
- 防止CSRF攻击：前后端统一使用SameSite Cookie

### 8.3 数据安全
- 敏感数据（用户信息、答题记录）必须加密传输（HTTPS）
- 数据库访问账号权限最小化，禁止使用超级账号
- 定期备份数据，备份文件加密存储
- 用户数据删除遵循"可遗忘权"要求，彻底清除

---

## 9. 性能优化指南
### 9.1 后端优化
- 数据库查询必须加索引，避免全表扫描
- 热点数据使用Redis缓存，降低数据库压力
- 大模型调用采用异步处理，避免阻塞主流程
- API接口设置合理的超时时间和熔断机制
- 分页查询限制最大页数，避免一次性查询大量数据

### 9.2 前端优化
- 启用Next.js静态生成和服务端渲染，提升首屏加载速度
- 图片资源压缩，使用WebP格式，懒加载
- 代码分割，按需加载，减少首屏包体积
- 避免不必要的重渲染，使用React.memo、useMemo等优化
- 启用CDN加速静态资源

### 9.3 数据库优化
- 合理设计索引，避免冗余索引
- 大表分库分表（用户量 > 10万时考虑）
- 定期清理历史数据，优化表空间
- 读写分离，读请求走从库

---

## 10. 部署规范
### 10.1 容器化部署
- 所有服务采用Docker容器化部署
- 使用docker-compose进行本地开发环境编排
- 生产环境使用Kubernetes或容器服务编排
- 镜像构建采用多阶段构建，减小镜像体积

### 10.2 环境配置
- 开发、测试、生产环境严格隔离
- 配置通过环境变量注入，不硬编码在代码中
- 敏感配置使用加密配置中心管理，不提交到代码库

### 10.3 监控与告警
- 系统指标监控：CPU、内存、磁盘、网络
- 业务指标监控：接口响应时间、错误率、用户活跃度
- 日志集中收集和查询，便于排查问题
- 设置合理的告警阈值，及时发现和处理故障