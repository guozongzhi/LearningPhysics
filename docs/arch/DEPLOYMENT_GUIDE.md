# 🚀 LearningPhysics 部署与管理指南

## 统一管理脚本 (manage.sh)

现在所有操作都通过根目录下的 `./manage.sh` 脚本完成。

> 说明：`start` / `stop` / `restart` / `status` / `diagnose` / `init` 仅用于本地开发。Linux 服务器生产部署请使用 `prod` / `prod-stop`。

### 常用命令

| 命令 | 说明 |
|------|------|
| `./manage.sh start` | **本地开发启动**：在后台启动前端和后端 |
| `./manage.sh stop` | **本地开发停止**：强行停止所有相关进程 |
| `./manage.sh restart` | **本地开发重启**：先停止，再启动 |
| `./manage.sh status` | **本地开发状态**：显示服务是否正在运行 |
| `./manage.sh diagnose` | **本地开发诊断**：检查各组件健康状况 |
| `./manage.sh init` | **本地开发初始化**：初始化数据库并导入题库 |
| `./manage.sh prod` | **生产部署启动**：使用 Docker Compose 启动生产环境 |
| `./manage.sh prod-stop` | **生产部署停止**：停止 Docker Compose 生产环境 |
| `./manage.sh help` | **帮助**：查看所有可用命令 |

---

## 🏗️ 项目结构优化

为了保持代码整洁，我们对目录结构进行了以下优化：

- **`venv/`**: Python 虚拟环境现在位于项目根目录。
- **`data/`**: 存放非代码资源（如 `questions.json` 题库）。
- **`config/`**: 存放配置文件（如 `.env` 环境文件）。
- **`logs/`**: 所有日志文件（`backend.log`, `frontend.log`）均统一存放在此目录下。

---

## 👤 测试账户

- **管理员**: `admin` / `admin123`
- **学生**: `student1` ... `student5` / `password123`

---

## 📊 日志查看

实时查看后端日志：
```bash
tail -f logs/backend.log
```

实时查看前端日志：
```bash
tail -f logs/frontend.log
```

---

---

## 📚 延伸阅读

- **[项目概览](OVERVIEW.md)**: 了解系统架构与演进历程。
- **[故障排查指南](../debug/TROUBLESHOOTING.md)**: 解决连接、登录及环境问题。
- **[日志系统指南](../debug/LOGGING_GUIDE.md)**: 学习如何高效利用日志进行调试。

---

**最后更新**: 2026-03-01
