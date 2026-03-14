# 贡献指南

首先，感谢你有兴趣为LearningPhysics项目做出贡献！

## 行为准则

请阅读我们的[行为准则](CODE_OF_CONDUCT.md)，以确保我们的社区友好且包容。

## 如何贡献

### 报告问题
- 使用GitHub Issues报告bug
- 详细描述问题的重现步骤
- 提供截图和环境信息（浏览器版本、Node.js版本等）
- 如果是安全问题，请不要公开报告，直接联系维护者

### 提交功能请求
- 在Issue中详细描述你想要的功能
- 说明这个功能的使用场景和价值
- 如果可能，提供实现思路

### 代码贡献
1. Fork 项目到自己的账号
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建一个 Pull Request

## 开发环境设置

### 前置要求
- Node.js >= 20
- Python >= 3.11
- Docker 和 Docker Compose

### 本地运行
1. 克隆项目
   ```bash
   git clone https://github.com/guozongzhi/LearningPhysics.git
   cd LearningPhysics
   ```

2. 配置环境变量
   ```bash
   # 复制并配置后端环境变量
   cp config/backend.env.example config/backend.env
   # 复制并配置前端环境变量
   cp config/frontend.env.example config/frontend.env
   ```

3. 启动开发环境
   ```bash
   ./manage.sh start
   ```

4. 访问应用
   - 前端: http://localhost:3000
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs

## 代码规范

### 前端 (TypeScript/React)
- 使用ESLint检查代码规范
- 遵循TypeScript严格模式
- 组件使用函数式组件和Hooks
- UI组件优先使用shadcn/ui
- 样式使用Tailwind CSS

### 后端 (Python/FastAPI)
- 使用ruff检查代码规范
- 遵循PEP 8规范
- 使用类型提示
- API遵循RESTful设计规范
- 数据库操作使用SQLModel

## 提交规范
提交信息遵循以下格式：
```
<类型>: <描述>

<可选的正文>
```

类型选项：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具/依赖等调整

## Pull Request 流程
1. PR标题清晰描述修改内容
2. PR描述详细说明修改的目的和实现方式
3. 确保所有CI检查通过
4. 至少需要一个维护者的批准才能合并
5. 合并前请rebase到最新的master分支

## 许可证
通过提交代码，你同意你的贡献将在MIT许可证下发布。