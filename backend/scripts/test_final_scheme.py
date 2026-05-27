import sys
import os
import asyncio
import time
import json
import re
from typing import List, Dict, Any

# 将 backend 根目录添加到 sys.path 中以支持相对导入
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.quiz_service import get_client, _evaluate_answer

# 20 道内置的高中物理题目及学生模拟作答
BASE_QUESTIONS = [
    {
        "question_type": "SINGLE_CHOICE",
        "content_latex": "一质量为2kg的物体以10m/s的速度做匀速直线运动，其动能为多少？",
        "solution_steps": "根据动能公式 E_k = 0.5 * m * v^2，代入数据得 E_k = 0.5 * 2 * 10^2 = 100 J。",
        "answer_schema": {"type": "single_choice", "correct_answer": "B", "options": [
            {"label": "A", "text": "50 J"}, {"label": "B", "text": "100 J"},
            {"label": "C", "text": "200 J"}, {"label": "D", "text": "400 J"}
        ]},
        "student_input": "B"  # 正确
    },
    {
        "question_type": "SINGLE_CHOICE",
        "content_latex": "关于冲量和动量，下列说法正确的是：",
        "solution_steps": "根据动量定理，物体所受合外力的冲量等于其动量的变化量。",
        "answer_schema": {"type": "single_choice", "correct_answer": "C", "options": [
            {"label": "A", "text": "冲量大的物体动量一定大"}, {"label": "B", "text": "动量大的物体受到的冲量一定大"},
            {"label": "C", "text": "合外力的冲量等于物体动量的变化量"}, {"label": "D", "text": "冲量和动量都是状态量"}
        ]},
        "student_input": "A"  # 错误
    },
    {
        "question_type": "BLANK",
        "content_latex": "一质点在半径为r=2m的圆轨道上做匀速圆周运动，线速度大小为v=4m/s，则其向心加速度大小为______ m/s^2。",
        "solution_steps": "根据向心加速度公式 a = v^2 / r = 4^2 / 2 = 8 m/s^2。",
        "answer_schema": {"type": "blank", "correct_answer": "8"},
        "student_input": "16"  # 错误
    },
    {
        "question_type": "CALCULATION",
        "content_latex": "理想变压器原副线圈匝数比为 n1:n2 = 5:1，原线圈输入电压为 220V，则副线圈输出电压为多少伏？",
        "solution_steps": "U2 = U1 * (n2/n1) = 220 * (1/5) = 44 V。",
        "answer_schema": {"type": "value_unit", "correct_value": "44", "unit": "V", "tolerance": 0.5},
        "student_input": "44"  # 错误（缺单位）
    },
    {
        "question_type": "TRUE_FALSE",
        "content_latex": "只有重力或弹力做功时，物体的机械能守恒。该说法是否正确？",
        "solution_steps": "机械能守恒的条件是只有重力或系统内弹力做功。此说法正确。",
        "answer_schema": {"type": "true_false", "correct_answer": "true"},
        "student_input": "true"  # 正确
    },
    {
        "question_type": "BLANK",
        "content_latex": "当物体受到的合外力不足以提供其做圆周运动所需的向心力时，物体将做______运动。",
        "solution_steps": "当合外力不足以提供向心力时，物体做离心运动。",
        "answer_schema": {"type": "blank", "correct_answer": "离心"},
        "student_input": "离心"  # 正确
    },
    {
        "question_type": "CALCULATION",
        "content_latex": "一定质量的理想气体，在压强保持不变时，温度从 27℃ 升高到 327℃，体积变为原来的多少倍？",
        "solution_steps": "T1=300K, T2=600K, V2/V1 = T2/T1 = 2倍。",
        "answer_schema": {"type": "value_unit", "correct_value": "2", "unit": "倍", "tolerance": 0.05},
        "student_input": "12.1"  # 错误
    },
    {
        "question_type": "SINGLE_CHOICE",
        "content_latex": "温度是物体分子______的标志。",
        "solution_steps": "微观上温度是分子平均动能的标志。",
        "answer_schema": {"type": "single_choice", "correct_answer": "B", "options": [
            {"label": "A", "text": "平均速率"}, {"label": "B", "text": "平均动能"},
            {"label": "C", "text": "总动能"}, {"label": "D", "text": "平均速度"}
        ]},
        "student_input": "C"  # 错误
    },
    {
        "question_type": "CALCULATION",
        "content_latex": "一质量为4kg的物体在光滑水平面上受到 F=8N 的水平拉力作用，其加速度大小为多少？",
        "solution_steps": "a = F / m = 8 / 4 = 2 m/s^2。",
        "answer_schema": {"type": "value_unit", "correct_value": "2", "unit": "m/s^2", "tolerance": 0.05},
        "student_input": "2 m/s^2"  # 正确
    },
    {
        "question_type": "BLANK",
        "content_latex": "功和能量的国际单位制单位是______。",
        "solution_steps": "功和能量的单位都是焦耳，符号为J。",
        "answer_schema": {"type": "blank", "correct_answer": "焦耳"},
        "student_input": "焦耳"  # 正确
    }
]

# 自动生成 20 道题
MOCK_QUESTIONS = []
for i in range(20):
    base = BASE_QUESTIONS[i % 10]
    q = base.copy()
    q["id"] = f"00000000-0000-0000-0000-{i+1:012d}"
    q["content_latex"] = f"({i+1}) {base['content_latex']}"
    MOCK_QUESTIONS.append(q)


def clean_content(content: str) -> str:
    """清洗模型输出内容，提取 JSON"""
    content = content.strip()
    # 去除可能的 markdown 标记
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    # 兜底：寻找 JSON 对象
    json_start = content.find('{')
    json_end = content.rfind('}')
    if json_start != -1 and json_end != -1 and json_end > json_start:
        content = content[json_start:json_end + 1]
    return content


def format_correct_answer_brief(q: Dict[str, Any]) -> str:
    """生成简短的正确答案字符串"""
    ans_schema = q.get("answer_schema") or {}
    q_type = q.get("question_type")
    if q_type in ["CHOICE", "SINGLE_CHOICE"]:
        return str(ans_schema.get("correct_answer"))
    elif q_type == "MULTIPLE_CHOICE":
        return ", ".join(ans_schema.get("correct_answers", []))
    elif q_type == "TRUE_FALSE":
        return "正确" if str(ans_schema.get("correct_answer")).lower() == "true" else "错误"
    elif q_type == "BLANK":
        return str(ans_schema.get("correct_answer"))
    elif q_type == "CALCULATION":
        return f"{ans_schema.get('correct_value')} {ans_schema.get('unit')}"
    return ""


# =========================================================================
# 最终方案 F：reasoning_split + 仅错题解析 + 20题一次打包
# =========================================================================
async def run_scheme_f(client) -> Dict[str, Any]:
    start_time = time.time()

    # 准备题目及预判结果
    items_list = []
    correct_count = 0
    wrong_indices = []

    for idx, q in enumerate(MOCK_QUESTIONS):
        is_correct = _evaluate_answer(q["student_input"], q["answer_schema"])
        correct_str = format_correct_answer_brief(q)
        status = "正确" if is_correct else "错误"

        if is_correct:
            correct_count += 1
        else:
            wrong_indices.append(idx)

        items_list.append(f"[题{idx+1}] ID:{q['id']} | 标准答案:{correct_str} | 学生答:{q['student_input']} | 判定:{status}")
        # 对错题额外提供题干和解题步骤
        if not is_correct:
            items_list.append(f"  题干: {q['content_latex']}")
            items_list.append(f"  解题步骤: {q['solution_steps']}")

    all_items_str = "\n".join(items_list)
    wrong_count = len(wrong_indices)
    total_count = len(MOCK_QUESTIONS)

    prompt = f"""你是一个物理测验批量批改 API。请直接返回一个标准 JSON 对象。
第一个输出字符必须是 {{，严禁输出 markdown 标记或任何前言。

共 {total_count} 题，已由系统预判对错（判定为"正确"的无需生成 feedback）。

{all_items_str}

请返回以下 JSON 结构：
1. "answers": 列表（{total_count} 个元素），每个元素包含：
   - "question_id": 与输入 ID 严格一致
   - "is_correct": 布尔值
   - "error_tag": 正确为 "CORRECT"；错误从 [VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR] 选一个
   - "feedback": 仅当 is_correct 为 false 时才生成（中文 2-3 句简要物理解析）。is_correct 为 true 时不要输出此字段。
2. "overall_summary": 纯文本，3-5句中文，包含整体评价、薄弱知识点和学习建议。"""

    # 使用 reasoning_split=true 将思考链分离到独立字段
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=3000,
        timeout=60.0,
        extra_body={"reasoning_split": True}
    )

    raw_content = response.choices[0].message.content or ""
    finish_reason = response.choices[0].finish_reason
    content = clean_content(raw_content)
    tokens_used = response.usage.total_tokens if response.usage else 0

    print(f"  [调试] raw_content 长度: {len(raw_content)}, finish_reason: {finish_reason}")
    print(f"  [调试] clean_content 前 300 字符: {repr(content[:300])}")

    success = False
    data = {}
    try:
        data = json.loads(content)
        answers = data.get("answers", [])
        summary = data.get("overall_summary", "")
        if len(answers) == total_count and summary:
            # 校验 ID 对应
            received_ids = {ans.get("question_id") for ans in answers}
            expected_ids = {q["id"] for q in MOCK_QUESTIONS}
            if received_ids == expected_ids:
                # 校验错题是否有 feedback
                wrong_with_feedback = sum(
                    1 for ans in answers
                    if not ans.get("is_correct") and ans.get("feedback")
                )
                print(f"  [调试] 错题数: {wrong_count}, 有 feedback 的错题数: {wrong_with_feedback}")
                success = True
            else:
                missing = expected_ids - received_ids
                print(f"  [调试] ID 不匹配，缺少: {missing}")
        else:
            print(f"  [调试] answers 数量: {len(answers)}, summary 长度: {len(summary)}")
    except Exception as e:
        print(f"  [调试] JSON 解析失败: {e}")
        print(f"  [调试] 原始 content 前 500 字符: {repr(content[:500])}")
        print(f"  [调试] 原始 content 后 500 字符: {repr(content[-500:])}")

    duration = time.time() - start_time
    return {
        "duration": duration,
        "tokens": tokens_used,
        "success": success,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "overall_summary": data.get("overall_summary", "") if success else "",
        "finish_reason": finish_reason
    }


# =========================================================================
# 对照方案 F_NO_SPLIT：不使用 reasoning_split（控制变量对比）
# =========================================================================
async def run_scheme_f_no_split(client) -> Dict[str, Any]:
    start_time = time.time()

    items_list = []
    correct_count = 0

    for idx, q in enumerate(MOCK_QUESTIONS):
        is_correct = _evaluate_answer(q["student_input"], q["answer_schema"])
        correct_str = format_correct_answer_brief(q)
        status = "正确" if is_correct else "错误"
        if is_correct:
            correct_count += 1
        items_list.append(f"[题{idx+1}] ID:{q['id']} | 标准答案:{correct_str} | 学生答:{q['student_input']} | 判定:{status}")
        if not is_correct:
            items_list.append(f"  题干: {q['content_latex']}")
            items_list.append(f"  解题步骤: {q['solution_steps']}")

    all_items_str = "\n".join(items_list)
    total_count = len(MOCK_QUESTIONS)

    prompt = f"""你是一个物理测验批量批改 API。请直接返回一个标准 JSON 对象。
第一个输出字符必须是 {{，严禁输出 markdown 标记或任何前言。

共 {total_count} 题，已由系统预判对错（判定为"正确"的无需生成 feedback）。

{all_items_str}

请返回以下 JSON 结构：
1. "answers": 列表（{total_count} 个元素），每个元素包含：
   - "question_id": 与输入 ID 严格一致
   - "is_correct": 布尔值
   - "error_tag": 正确为 "CORRECT"；错误从 [VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR] 选一个
   - "feedback": 仅当 is_correct 为 false 时才生成（中文 2-3 句简要物理解析）。is_correct 为 true 时不要输出此字段。
2. "overall_summary": 纯文本，3-5句中文，包含整体评价、薄弱知识点和学习建议。"""

    # 不使用 reasoning_split（对照组）
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=3000,
        timeout=60.0
    )

    raw_content = response.choices[0].message.content or ""
    finish_reason = response.choices[0].finish_reason
    # 对照组需要先清理 think 标签
    if "<think>" in raw_content:
        think_end = raw_content.find("</think>")
        if think_end != -1:
            raw_content = raw_content[think_end + 8:].strip()
        else:
            raw_content = re.sub(r'<think>[\s\S]*', '', raw_content).strip()

    content = clean_content(raw_content)
    tokens_used = response.usage.total_tokens if response.usage else 0

    print(f"  [调试-无split] raw_content 长度: {len(raw_content)}, finish_reason: {finish_reason}")

    success = False
    data = {}
    try:
        data = json.loads(content)
        answers = data.get("answers", [])
        summary = data.get("overall_summary", "")
        if len(answers) == total_count and summary:
            success = True
        else:
            print(f"  [调试-无split] answers 数量: {len(answers)}")
    except Exception as e:
        print(f"  [调试-无split] JSON 解析失败: {e}")

    duration = time.time() - start_time
    return {
        "duration": duration,
        "tokens": tokens_used,
        "success": success,
        "finish_reason": finish_reason
    }


async def main():
    print("=" * 85)
    print("最终方案验证：reasoning_split + 仅错题解析 + 20 题一次打包")
    print(f"模型: {settings.OPENAI_MODEL}")
    print(f"API: {settings.OPENAI_BASE_URL}")
    print("=" * 85)

    client = get_client()
    if not client:
        print("错误: 未配置大模型 API。")
        return

    # 1. 运行对照组（不使用 reasoning_split）
    print("\n[对照组] 启动：仅错题解析 + 20 题打包（无 reasoning_split）...")
    try:
        res_no_split = await run_scheme_f_no_split(client)
        print(f"-> 对照组完成！耗时: {res_no_split['duration']:.2f}s, Token: {res_no_split['tokens']}, finish: {res_no_split['finish_reason']}, 成功: {res_no_split['success']}")
    except Exception as e:
        print(f"-> 对照组崩溃: {e}")
        res_no_split = {"duration": 0, "tokens": 0, "success": False, "finish_reason": "error"}

    # 2. 运行最终方案（使用 reasoning_split）
    print("\n[方案 F] 启动：reasoning_split + 仅错题解析 + 20 题打包 ...")
    try:
        res_f = await run_scheme_f(client)
        print(f"-> 方案 F 完成！耗时: {res_f['duration']:.2f}s, Token: {res_f['tokens']}, finish: {res_f['finish_reason']}, 成功: {res_f['success']}")
    except Exception as e:
        print(f"-> 方案 F 崩溃: {e}")
        res_f = {"duration": 0, "tokens": 0, "success": False, "finish_reason": "error", "correct_count": 0, "wrong_count": 0}

    # 输出对比
    print("\n" + "=" * 85)
    print(f"{'方案':<40} | {'耗时(秒)':<10} | {'Token':<10} | {'finish_reason':<15} | {'成功':<8}")
    print("-" * 85)
    print(f"{'对照组 (无 reasoning_split)':<40} | {res_no_split['duration']:<10.2f} | {res_no_split['tokens']:<10} | {res_no_split['finish_reason']:<15} | {str(res_no_split['success']):<8}")
    print(f"{'方案 F (reasoning_split=true)':<40} | {res_f['duration']:<10.2f} | {res_f['tokens']:<10} | {res_f.get('finish_reason',''):<15} | {str(res_f['success']):<8}")
    print("=" * 85)

    if res_f.get("success"):
        print(f"\n答对: {res_f['correct_count']}/20, 错题: {res_f['wrong_count']}")
        print(f"\n[整体报告]:")
        print(res_f.get("overall_summary"))
    print("=" * 85)


if __name__ == "__main__":
    asyncio.run(main())
