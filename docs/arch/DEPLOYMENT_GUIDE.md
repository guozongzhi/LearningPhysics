# 🚀 LearningPhysics 部署与管理指南

## 统一管理脚本 (manage.sh)

现在所有操作都通过根目录下的 `./manage.sh` 脚本完成。

### 常用命令

| 命令 | 说明 |
|------|------|
| `./manage.sh start` | **启动服务**：在后台启动前端和后端 |
| `./manage.sh stop` | **停止服务**：强行停止所有相关进程 |
| `./manage.sh restart` | **重启服务**：先停止，再启动 |
| `./manage.sh status` | **查看状态**：显示服务是否正在运行 |
| `./manage.sh diagnose` | **系统诊断**：检查各组件健康状况 |
| `./manage.sh init` | **初始化**：初始化数据库并导入题库 |
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
