import sys
import os
import asyncio
import time
from sqlalchemy import select

# 将 backend 根目录添加到 sys.path 中以支持相对导入
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import async_session_factory
from app.models.models import User, Question
from app.services.quiz_service import submit_quiz
from app.schemas.quiz import QuizSubmitRequest, StudentAnswer

async def run_single_submission(user, question_id, index):
    """模拟单名学生的提交请求并迭代进度"""
    start = time.time()
    # 模拟一道题的提交
    req = QuizSubmitRequest(
        quiz_id="00000000-0000-0000-0000-000000000000",
        answers=[StudentAnswer(question_id=question_id, student_input="5 m/s^2")]
    )
    success = False
    error_msg = ""
    try:
        async with async_session_factory() as session:
            # 必须为每次请求使用独立的数据库会话 session
            generator = submit_quiz(session, req, user.id)
            async for chunk in generator:
                # 迭代并消耗流式输出以确保服务执行
                pass
            success = True
    except Exception as e:
        error_msg = str(e)
        
    duration = time.time() - start
    if success:
        print(f"[Concurrency Test] {index:02d}. User '{user.username}' submitted successfully in {duration:.2f}s")
    else:
        print(f"[Concurrency Test] {index:02d}. User '{user.username}' FAILED in {duration:.2f}s: {error_msg}")
    return success, duration

async def main():
    print("=" * 60)
    print("Starting Multi-User Concurrency & API QPS Test")
    print("=" * 60)
    
    async with async_session_factory() as session:
        # 1. 查找非管理员的用户
        result = await session.execute(
            select(User).where(User.is_admin == False, User.is_active == True).limit(5)
        )
        users = result.scalars().all()
        
        # 2. 查找一道真实的题目
        q_result = await session.execute(select(Question).limit(1))
        question = q_result.scalar_one_or_none()
        
    if not users:
        print("Error: No test students found in database. Please run seed script first.")
        return
    if not question:
        print("Error: No questions found in database. Please import questions first.")
        return
        
    # 如果用户数量不够，通过复制来凑够 5 个并发任务
    test_users = users
    while len(test_users) < 5:
        test_users = test_users + users
    test_users = test_users[:5]
    
    print(f"Total concurrent users to simulate: {len(test_users)}")
    print(f"Target Question ID: {question.id}")
    print("Triggering concurrent submissions...")
    
    start_time = time.time()
    
    # 并发运行 5 个提交请求
    tasks = [run_single_submission(user, question.id, idx + 1) for idx, user in enumerate(test_users)]
    results = await asyncio.gather(*tasks)
    
    total_duration = time.time() - start_time
    success_count = sum(1 for res in results if res[0])
    failed_count = len(results) - success_count
    
    print("=" * 60)
    print("Concurrency Test Summary")
    print("=" * 60)
    print(f"Total simulated requests : {len(results)}")
    print(f"Success Count            : {success_count}")
    print(f"Failed Count             : {failed_count}")
    print(f"Total Elapsed Time       : {total_duration:.2f} seconds")
    print(f"Average Request Time     : {sum(r[1] for r in results)/len(results):.2f} seconds")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
