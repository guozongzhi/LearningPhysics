#!/usr/bin/env python3
"""
日志查看和分析工具
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# 自动探测日志目录
PROJECT_ROOT = Path(__file__).parent.parent
LOG_DIR = PROJECT_ROOT / "logs"

if not LOG_DIR.exists():
    # 尝试在 backend 同级目录下找
    LOG_DIR = Path(__file__).parent / "logs"

def print_header(title):
    """打印标题"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def view_log_file(log_file, lines=50):
    """查看日志文件最后N行"""
    if not log_file.exists():
        print(f"❌ 日志文件不存在: {log_file}")
        return
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            log_lines = f.readlines()
        
        print(f"📄 {log_file.name} (总 {len(log_lines)} 行)")
        
        if len(log_lines) > lines:
            print(f"显示最后 {lines} 行:\n")
            for line in log_lines[-lines:]:
                print(line.rstrip())
        else:
            for line in log_lines:
                print(line.rstrip())
    except Exception as e:
        print(f"❌ 工具错误: {e}")

def get_log_stats():
    """获取日志统计信息"""
    print_header("📊 日志统计")
    
    if not LOG_DIR.exists():
        print(f"❌ 日志目录不存在: {LOG_DIR}")
        return
    
    total_size = 0
    for log_file in LOG_DIR.glob("*.log"):
        size = log_file.stat().st_size
        total_size += size
        
        # 显示文件信息
        size_mb = size / (1024 * 1024)
        mod_time = datetime.fromtimestamp(log_file.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        
        icon = "🔴" if size_mb > 10 else "🟡" if size_mb > 5 else "🟢"
        print(f"{icon} {log_file.name}")
        print(f"   大小: {size_mb:.2f} MB")
        print(f"   修改时间: {mod_time}\n")
    
    print(f"📦 总大小: {total_size / (1024 * 1024):.2f} MB")

def search_log(pattern, limit=20):
    """搜索日志"""
    print_header(f"🔍 搜索: {pattern}")
    
    found = 0
    for log_file in LOG_DIR.glob("*.log"):
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    if pattern.lower() in line.lower():
                        print(f"{log_file.name}:{line_num}")
                        print(f"  {line.strip()}\n")
                        found += 1
                        if found >= limit:
                            return
        except Exception as e:
            print(f"⚠️  无法读取 {log_file.name}: {e}")
    
    print(f"✅ 找到 {found} 条匹配记录")

def clean_old_logs(days=7):
    """清理过期日志"""
    print_header(f"🧹 清理 {days} 天前的日志")
    
    if not LOG_DIR.exists():
        print(f"❌ 日志目录不存在: {LOG_DIR}")
        return
    
    cutoff_date = datetime.now() - timedelta(days=days)
    deleted = 0
    
    for log_file in LOG_DIR.glob("*.log.*"):
        if log_file.stat().st_mtime < cutoff_date.timestamp():
            try:
                log_file.unlink()
                print(f"🗑️  已删除: {log_file.name}")
                deleted += 1
            except Exception as e:
                print(f"⚠️  无法删除 {log_file.name}: {e}")
    
    print(f"\n✅ 已删除 {deleted} 个文件")

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("""
LearningPhysics 日志工具

用法:
  python3 check_logs.py app [lines]      - 查看应用日志 (默认50行)
  python3 check_logs.py api [lines]      - 查看API日志
  python3 check_logs.py error [lines]    - 查看错误日志
  python3 check_logs.py stats            - 显示日志统计
  python3 check_logs.py search <pattern> - 搜索日志
  python3 check_logs.py clean [days]     - 清理过期日志 (默认7天)

示例:
  python3 check_logs.py app              - 查看最后50行应用日志
  python3 check_logs.py app 100          - 查看最后100行应用日志
  python3 check_logs.py search "ERROR"   - 搜索所有错误
  python3 check_logs.py clean 14         - 清理14天前的日志
        """)
        return
    
    command = sys.argv[1].lower()
    
    if command == "app":
        lines = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        print_header("📋 应用日志")
        view_log_file(LOG_DIR / "app.log", lines)
    
    elif command == "api":
        lines = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        print_header("📡 API 日志")
        view_log_file(LOG_DIR / "api.log", lines)
    
    elif command == "error":
        lines = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        print_header("❌ 错误日志")
        view_log_file(LOG_DIR / "error.log", lines)
    
    elif command == "rid":
        if len(sys.argv) < 3:
            print("❌ 请提供 Request ID")
            return
        rid = sys.argv[2]
        print_header(f"🆔 追踪请求: {rid}")
        search_log(f"RID:{rid}", limit=100)
    
    elif command == "stats":
        get_log_stats()
    
    elif command == "search":
        if len(sys.argv) < 3:
            print("❌ 请提供搜索关键词")
            return
        pattern = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        search_log(pattern, limit)
    
    elif command == "clean":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        clean_old_logs(days)
    
    else:
        print(f"❌ 未知命令: {command}")
        print("使用 'python3 check_logs.py' 查看帮助")

if __name__ == "__main__":
    main()
