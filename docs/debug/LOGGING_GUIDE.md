# 📊 日志系统完整指南 (Logging Guide)

本指南涵盖了 LearningPhysics 日志系统的架构、配置、查看工具及最佳实践。

## 📂 日志文件结构

日志统一存储在项目根目录的 `logs/` 文件夹中：

- **`logs/app.log`**: 记录应用生命周期事件（启动、关闭、认证事件、系统初始化）。
- **`logs/api.log`**: 记录所有 HTTP 请求、响应码、执行耗时及 [RID] 请求 ID。
- **`logs/error.log`**: 记录所有系统异常、堆栈追踪及从前端上报的客户端错误。

### 日志格式说明
所有日志均遵循以下格式，包含全链路追踪 ID：
`时间戳 - 模块 - 级别 - [RID:请求ID] - [PID:进程ID] - [文件:行号] - 消息内容`

---

## 🛠️ 日志查看工具 (check_logs.py)

根目录下提供了 `backend/check_logs.py` 工具，支持多种查询方式。

### 常用命令

| 命令 | 示例 | 说明 |
|------|------|------|
| **查看应用日志** | `python3 backend/check_logs.py app [行数]` | 查看系统启动和认证记录 |
| **查看 API 日志** | `python3 backend/check_logs.py api [行数]` | 查看 HTTP 访问记录 |
| **查看错误日志** | `python3 backend/check_logs.py error` | 快速定位系统报错 |
| **链路追踪** | `python3 backend/check_logs.py rid <RID>` | **追踪特定请求的所有日志** |
| **关键词搜索** | `python3 backend/check_logs.py search "关键字"` | 全局搜索匹配项 |
| **查看统计** | `python3 backend/check_logs.py stats` | 查看日志文件大小和状态 |
| **清理日志** | `python3 backend/check_logs.py clean [天数]` | 清理旧的滚动日志文件 |

---

## 🔗 全链路追踪 (Request ID)

系统为每个进入的请求分配一个唯一的 `Request ID (RID)`。

1. **后端产生**: `APILoggingMiddleware` 会生成 RID。
2. **日志关联**: 所有的业务逻辑日志都会携带该 RID。
3. **前端反馈**: 响应头中包含 `X-Request-ID`，前端在报错时应展示或记录此 ID。
4. **快速定位**: 拿着前端反馈的 RID，执行 `python3 backend/check_logs.py rid <RID>` 即可看到该请求在后端的所有动作。

---

## 🌐 前端日志上报

前端可以通过 `POST /api/v1/logs/client` 接口将浏览器端的错误实时发送到后端。
这些错误会被标记为 `[CLIENT]` 并记录在 `logs/error.log` 中，实现全栈日志统一管理。

---

## 🔧 维护与配置

- **自动轮转**: 每个日志文件达到 10MB 时会自动轮转，默认保留最近 10 个备份。
- **配置位置**: `backend/app/core/logging_config.py`。
- **环境变量**: 可以在 `config/backend.env` 中调整日志级别。
