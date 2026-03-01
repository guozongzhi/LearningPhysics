"""
日志配置模块 - 统一管理应用日志记录
"""

import logging
import logging.handlers
import os
from pathlib import Path
from datetime import datetime

# 创建日志目录 (项目根目录下)
LOG_DIR = Path(__file__).parent.parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# 日志文件路径
APP_LOG = LOG_DIR / "app.log"
API_LOG = LOG_DIR / "api.log"
ERROR_LOG = LOG_DIR / "error.log"

import contextvars

# 用于存储当前请求 ID 的上下文变量
request_id_ctx = contextvars.ContextVar("request_id", default="INTERNAL")

# 日志格式 (增加 Request-ID)
DETAILED_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - [RID:%(request_id)s] - [PID:%(process)d] - [%(filename)s:%(lineno)d] - %(message)s'
SIMPLE_FORMAT = '%(asctime)s - %(levelname)s - [RID:%(request_id)s] - %(message)s'

class RequestIDFilter(logging.Filter):
    """向日志记录注入当前请求 ID 的过滤器"""
    def filter(self, record):
        record.request_id = request_id_ctx.get()
        return True

# 颜色映射 (用于控制台)
COLOR_MAP = {
    'DEBUG': '\033[0;36m',    # 青色
    'INFO': '\033[0;32m',     # 绿色
    'WARNING': '\033[0;33m',  # 黄色
    'ERROR': '\033[0;31m',    # 红色
    'CRITICAL': '\033[0;35m', # 紫色
    'NC': '\033[0m'           # 无颜色
}

class ColoredFormatter(logging.Formatter):
    def format(self, record):
        color = COLOR_MAP.get(record.levelname, COLOR_MAP['NC'])
        record.levelname = f"{color}{record.levelname}{COLOR_MAP['NC']}"
        return super().format(record)

def setup_logger(name: str, log_file: Path, level=logging.INFO, is_error=False):
    """
    设置日志记录器
    
    Args:
        name: 记录器名称
        log_file: 日志文件路径
        level: 日志级别
        is_error: 是否为错误日志
    
    Returns:
        配置好的记录器
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    if logger.hasHandlers():
        return logger
    
    # 文件处理器 - 循环日志 (单个文件最大 10MB)
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,  # 保留 10 个备份
        encoding='utf-8'
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(logging.Formatter(DETAILED_FORMAT))
    
    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(ColoredFormatter(SIMPLE_FORMAT))
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    # 添加 Request-ID 过滤器
    logger.addFilter(RequestIDFilter())
    
    return logger


# 初始化各种日志记录器
app_logger = setup_logger('app', APP_LOG, logging.INFO)
api_logger = setup_logger('api', API_LOG, logging.INFO)
error_logger = setup_logger('error', ERROR_LOG, logging.ERROR)


def log_app_startup(version: str = "1.0.0"):
    """记录应用启动"""
    startup_info = f"""
╔════════════════════════════════════════════════════════════╗
║                  LearningPhysics API                       ║
║                   Version {version:<37} ║
║              启动于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<30} ║
╚════════════════════════════════════════════════════════════╝
"""
    app_logger.info(startup_info)


def log_app_shutdown():
    """记录应用关闭"""
    shutdown_info = f"应用关闭 - 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    app_logger.info(shutdown_info)


def log_api_request(method: str, path: str, status_code: int, duration_ms: float, user_id: str = None):
    """
    记录 API 请求
    
    Args:
        method: HTTP 方法
        path: 请求路径
        status_code: 响应状态码
        duration_ms: 执行时间（毫秒）
        user_id: 用户 ID（可选）
    """
    user_info = f" [User: {user_id}]" if user_id else ""
    api_logger.info(
        f"{method:6} {path:40} -> {status_code} ({duration_ms:.2f}ms){user_info}"
    )


def log_database_operation(operation: str, table: str, count: int = 0, details: str = None):
    """
    记录数据库操作
    
    Args:
        operation: 操作类型 (SELECT, INSERT, UPDATE, DELETE)
        table: 表名
        count: 受影响的行数
        details: 详细信息
    """
    count_info = f" ({count} rows)" if count > 0 else ""
    details_info = f" - {details}" if details else ""
    api_logger.debug(
        f"DB {operation:6} {table:20}{count_info}{details_info}"
    )


def log_error(error_type: str, message: str, exception=None, user_id: str = None):
    """
    记录错误
    
    Args:
        error_type: 错误类型
        message: 错误消息
        exception: 异常对象
        user_id: 用户 ID（可选）
    """
    user_info = f" [User: {user_id}]" if user_id else ""
    error_logger.error(
        f"{error_type}: {message}{user_info}",
        exc_info=exception
    )


def log_auth_event(event_type: str, username: str, success: bool, details: str = None):
    """
    记录认证事件
    
    Args:
        event_type: 事件类型 (LOGIN, LOGOUT, REGISTER, etc)
        username: 用户名
        success: 是否成功
        details: 详细信息
    """
    status = "SUCCESS" if success else "FAILED"
    details_info = f" - {details}" if details else ""
    log_level = logging.INFO if success else logging.WARNING
    app_logger.log(
        log_level,
        f"AUTH {event_type:10} {username:20} [{status}]{details_info}"
    )


def log_data_import(data_type: str, count: int, duration_ms: float):
    """
    记录数据导入操作
    
    Args:
        data_type: 数据类型 (QUESTIONS, USERS, etc)
        count: 导入的记录数
        duration_ms: 执行时间（毫秒）
    """
    app_logger.info(
        f"IMPORT {data_type:15} - {count:5} records - {duration_ms:.2f}ms"
    )


def get_log_stats() -> dict:
    """获取日志统计信息"""
    stats = {
        'app_log_size': APP_LOG.stat().st_size if APP_LOG.exists() else 0,
        'api_log_size': API_LOG.stat().st_size if API_LOG.exists() else 0,
        'error_log_size': ERROR_LOG.stat().st_size if ERROR_LOG.exists() else 0,
        'app_log_path': str(APP_LOG),
        'api_log_path': str(API_LOG),
        'error_log_path': str(ERROR_LOG),
    }
    return stats


__all__ = [
    'app_logger',
    'api_logger', 
    'error_logger',
    'log_app_startup',
    'log_app_shutdown',
    'log_api_request',
    'log_database_operation',
    'log_error',
    'log_auth_event',
    'log_data_import',
    'get_log_stats',
]
