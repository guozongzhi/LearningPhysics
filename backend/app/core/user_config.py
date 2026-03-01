import json
import os
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional

# 获取项目根目录 (假设此文件在 backend/app/core/ 下)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
CONFIG_FILE = BASE_DIR / "config" / "users.json"

class UserConfigData(BaseModel):
    username: str
    password: str
    email: str

class AppUsersConfig(BaseModel):
    admin: UserConfigData
    whitelist_only_registration: bool = False
    students: List[UserConfigData] = []

def load_users_config() -> AppUsersConfig:
    """从 config/users.json 加载用户配置"""
    if not CONFIG_FILE.exists():
        # 返回默认配置作为后备
        return AppUsersConfig(
            admin=UserConfigData(
                username="admin",
                password="admin123",
                email="admin@learningphysics.com"
            ),
            whitelist_only_registration=False,
            students=[]
        )
        
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return AppUsersConfig(**data)
    except Exception as e:
        print(f"解析 users.json 失败: {e}")
        # 如果解析失败也返回默认后备配置
        return AppUsersConfig(
            admin=UserConfigData(
                username="admin",
                password="admin123",
                email="admin@learningphysics.com"
            ),
            whitelist_only_registration=False,
            students=[]
        )

# 导出一个全局可用的配置对象
users_config = load_users_config()

def get_whitelisted_usernames() -> List[str]:
    """获取允许注册的学生用户名列表"""
    return [student.username for student in users_config.students]
