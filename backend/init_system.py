#!/usr/bin/env python3
"""
任务脚本：初始化系统数据（管理员、学生、知识点、题目）
"""
import asyncio
import sys
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_engine, async_session_factory, init_db
from app.models.models import User, KnowledgeNode, Question, UserMastery
from app.core.auth import get_password_hash
import uuid


from app.core.user_config import users_config

async def init_admin():
    """创建或验证管理员用户"""
    async with async_session_factory() as db:
        result = await db.execute(
            select(User).where(User.username == users_config.admin.username)
        )
        existing_user = result.scalar_one_or_none()
        if existing_user:
            print("✓ 管理员用户已存在")
            return
        
        admin_user = User(
            id=uuid.uuid4(),
            email=users_config.admin.email,
            username=users_config.admin.username,
            hashed_password=get_password_hash(users_config.admin.password),
            is_active=True,
            is_admin=True
        )
        
        db.add(admin_user)
        await db.commit()
        print("✓ 管理员用户创建成功")
        print(f"  用户名: {users_config.admin.username}")
        print(f"  密码: {users_config.admin.password}")


async def init_students():
    """创建示例学生用户"""
    students = [
        {"username": "student1", "password": "password123", "email": "student1@example.com"},
        {"username": "student2", "password": "password123", "email": "student2@example.com"},
        {"username": "student3", "password": "password123", "email": "student3@example.com"},
        {"username": "student4", "password": "password123", "email": "student4@example.com"},
        {"username": "student5", "password": "password123", "email": "student5@example.com"},
    ]
    
    async with async_session_factory() as db:
        created_count = 0
        for student_data in students:
            result = await db.execute(
                select(User).where(User.username == student_data["username"])
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                continue
            
            student_user = User(
                id=uuid.uuid4(),
                email=student_data["email"],
                username=student_data["username"],
                hashed_password=get_password_hash(student_data["password"]),
                is_active=True,
                is_admin=False
            )
            
            db.add(student_user)
            await db.commit()
            created_count += 1
        
        if created_count > 0:
            print(f"✓ 创建了 {created_count} 个学生账户")
        else:
            print("✓ 所有学生账户已存在")


async def init_knowledge_nodes():
    """创建或验证知识点"""
    topics = [
        {"name": "力学", "code": "mechanics", "level": 1},
        {"name": "热学", "code": "thermodynamics", "level": 1},
        {"name": "光学", "code": "optics", "level": 1},
        {"name": "电磁学", "code": "electromagnetism", "level": 1},
        {"name": "现代物理", "code": "modern_physics", "level": 1},
    ]
    
    async with async_session_factory() as db:
        created_count = 0
        for topic_data in topics:
            result = await db.execute(
                select(KnowledgeNode).where(KnowledgeNode.code == topic_data["code"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                continue
            
            node = KnowledgeNode(**topic_data)
            db.add(node)
            await db.commit()
            created_count += 1
        
        if created_count > 0:
            print(f"✓ 创建了 {created_count} 个知识点")
        else:
            print("✓ 所有知识点已存在")


async def init_user_masteries():
    """初始化用户掌握度"""
    async with async_session_factory() as db:
        # 获取所有学生和知识点
        students_result = await db.execute(
            select(User).where(User.is_admin == False)
        )
        students = students_result.scalars().all()
        
        nodes_result = await db.execute(select(KnowledgeNode))
        nodes = nodes_result.scalars().all()
        
        if not students or not nodes:
            print("✓ 跳过用户掌握度初始化（无学生或知识点）")
            return
        
        # 为每个学生初始化每个知识点的掌握度
        count = 0
        for student in students:
            for node in nodes:
                # 检查是否已存在
                result = await db.execute(
                    select(UserMastery).where(
                        UserMastery.user_id == student.id,
                        UserMastery.node_id == node.id
                    )
                )
                existing = result.scalar_one_or_none()
                
                if not existing:
                    mastery = UserMastery(
                        user_id=student.id,
                        node_id=node.id,
                        mastery_score=0.0
                    )
                    db.add(mastery)
                    count += 1
        
        if count > 0:
            await db.commit()
            print(f"✓ 初始化了 {count} 个用户掌握度记录")
        else:
            print("✓ 所有用户掌握度记录已存在")


async def main():
    print("=" * 60)
    print("LearningPhysics - 系统数据初始化")
    print("=" * 60)
    
    try:
        await init_db()
        await init_admin()
        await init_students()
        await init_knowledge_nodes()
        await init_user_masteries()
        
        print("\n" + "=" * 60)
        print("✅ 初始化完成！")
        print("=" * 60)
        
        print("\n【管理员登录信息】")
        print("  用户名: admin")
        print("  密码: admin123")
        print("  地址: http://192.168.71.224:3000/admin")
        
        print("\n【学生登录信息】")
        for i in range(1, 6):
            print(f"  用户名: student{i}")
            print(f"  密码: password123")
            if i < 5:
                print()
        
        print("\n【系统现状】")
        async with async_session_factory() as db:
            # 统计题目数量
            questions_result = await db.execute(select(Question))
            question_count = len(questions_result.scalars().all())
            
            print(f"  📚 题目总数: {question_count} 道")
            print(f"  👥 学生人数: 5 名")
            print(f"  📂 知识点: 5 个")
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
