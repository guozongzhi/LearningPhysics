# 🔍 系统故障排查与修复指南 (Troubleshooting)

本指南总结了系统开发与运行过程中遇到的常见问题及其解决方案。

## 🚨 核心排查流程

1. **运行诊断**: 执行 `./manage.sh diagnose` 检查基础组件状态。
2. **查看错误日志**: 执行 `python3 backend/check_logs.py error` 查看最新报错。
3. **链路追踪**: 如果是特定操作失败，获取 `X-Request-ID` 并运行 `python3 backend/check_logs.py rid <RID>`。

---

## 🔐 登录与认证问题

### 1. **登录失败: Failed to fetch**
- **现象**: 浏览器提示无法连接到服务器。
- **原因**: 前端配置的 `NEXT_PUBLIC_API_URL` 与后端实际运行地址不一致，或 CORS 跨域限制。
- **解决**:
  - 确保 `config/frontend.env` 中的 IP 与后端一致。
  - 检查 `backend/main.py` 中的 `origins` 列表是否包含当前访问地址。
  - 运行 `./manage.sh restart` 自动重新检测 IP 并更新配置。

### 2. **登录报错: ValueError for bcrypt**
- **现象**: 后端日志显示 `password cannot be longer than 72 bytes`。
- **原因**: Python 3.13 环境下 `passlib` 与新版 `bcrypt` 的不兼容问题。
- **解决**: 确保 `bcrypt` 版本锁定在 `3.2.2`。

---

## 🏗️ 环境与启动问题

### 1. **端口冲突 (8000/3000)**
- **解决**: 运行 `./manage.sh stop` 强制清理进程，或使用 `lsof -i :8000` 手动杀进程。

### 2. **虚拟环境权限/损坏**
- **现象**: 报错 `Permission denied` 或 `Abort trap: 6`。
- **原因**: 迁移文件夹导致的 `.bin` 路径失效或解释器冲突。
- **解决**: 运行以下命令重建环境：
  ```bash
  rm -rf venv && python3 -m venv venv
  ./venv/bin/pip install -r backend/requirements.txt
  ```

---

## 💾 数据库与数据问题

### 1. **数据库连接失败**
- **解决**: 确保本地 PostgreSQL 已启动。检查 `config/backend.env` 中的 `DATABASE_URL` 是否匹配最新的数据库名（例如拼写修正后的 `learningphysics`）。

### 2. **数据未初始化/题库为空**
- **解决**: 运行 `./manage.sh init`。该操作会执行 `init_system.py`，自动创建管理员账户和导入 `data/questions.json` 中的题目。

---

## ⚡ 快速诊断命令手册

```bash
# 查看后端实时日志
tail -f logs/backend.log

# 检查进程状态
./manage.sh status

# 检查特定 Request ID
python3 backend/check_logs.py rid <RID>

# 搜索特定关键字
python3 backend/check_logs.py search "database"
```
