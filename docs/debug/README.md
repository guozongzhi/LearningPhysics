# 🛠️ 调试与监控中心 (Debug & Monitoring)

本目录包含 LearningPhysics 系统的诊断工具、调试指南和运行日志说明。

## 📖 核心指南

- **[日志系统指南 (Logging Guide)](LOGGING_GUIDE.md)**: 详细说明了如何使用 `check_logs.py` 工具查看、搜索和分析全链路日志。
- **[故障排查指南 (Troubleshooting)](TROUBLESHOOTING.md)**: 涵盖了登录失败、网络跨域、数据库连接等常见问题的解决方案。

## ⚙️ 管理工具 (在项目根目录)

- **`./manage.sh diagnose`**: 一键诊断系统各组件状态。
- **`./manage.sh status`**: 查看后台服务进程是否健康。
- **`backend/check_logs.py`**: 多功能日志分析命令行工具。

## 📁 目录结构

- `docs/debug/`: 调试相关的说明文档（本目录）。
- `logs/`: 系统运行时产生的各种日志文件。
- `backend/tests/`: 后端接口测试脚本。
