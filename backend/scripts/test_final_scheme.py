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
# 通用方案运行器：reasoning_split + 仅错题解析 + 可变 max_tokens
# =========================================================================
def build_prompt(questions: List[Dict[str, Any]]) -> tuple:
    """构建 Prompt，返回 (prompt_str, correct_count, wrong_count)"""
    items_list = []
    correct_count = 0
    wrong_count = 0

    for idx, q in enumerate(questions):
        is_correct = _evaluate_answer(q["student_input"], q["answer_schema"])
        correct_str = format_correct_answer_brief(q)
        status = "正确" if is_correct else "错误"

        if is_correct:
            correct_count += 1
        else:
            wrong_count += 1

        items_list.append(f"[题{idx+1}] ID:{q['id']} | 答案:{correct_str} | 学生:{q['student_input']} | {status}")
        if not is_correct:
            items_list.append(f"  题干: {q['content_latex']}")
            items_list.append(f"  解法: {q['solution_steps']}")

    all_items_str = "\n".join(items_list)
    total_count = len(questions)

    prompt = f"""你是物理测验批改API。直接输出JSON，第一个字符必须是{{。
共{total_count}题，系统已预判对错。

{all_items_str}

JSON格式：
{{"answers":[{{"question_id":"ID","is_correct":bool,"error_tag":"CORRECT或VALUE_ERROR/UNIT_ERROR/CALCULATION_ERROR/CONCEPT_ERROR/FORMAT_ERROR","feedback":"仅错题输出1句中文解析"}}],"overall_summary":"3句中文整体评价与建议"}}

规则：is_correct为true时不输出feedback字段。"""

    return prompt, correct_count, wrong_count


async def run_test(client, label: str, max_tokens: int, use_split: bool) -> Dict[str, Any]:
    """运行单次测试"""
    start_time = time.time()
    prompt, correct_count, wrong_count = build_prompt(MOCK_QUESTIONS)
    total_count = len(MOCK_QUESTIONS)

    kwargs = {
        "model": settings.OPENAI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": max_tokens,
        "timeout": 120.0,
    }
    if use_split:
        kwargs["extra_body"] = {"reasoning_split": True}

    response = await client.chat.completions.create(**kwargs)

    raw_content = response.choices[0].message.content or ""
    finish_reason = response.choices[0].finish_reason
    tokens_used = response.usage.total_tokens if response.usage else 0

    # 尝试获取 reasoning tokens 信息
    reasoning_tokens = 0
    completion_tokens = 0
    if response.usage:
        completion_tokens = getattr(response.usage, 'completion_tokens', 0) or 0
        # MiniMax 可能在 completion_tokens_details 或其他字段返回 reasoning tokens
        details = getattr(response.usage, 'completion_tokens_details', None)
        if details:
            reasoning_tokens = getattr(details, 'reasoning_tokens', 0) or 0

    # 不使用 split 时手动清理 think 标签
    if not use_split and "<think>" in raw_content:
        think_end = raw_content.find("</think>")
        if think_end != -1:
            raw_content = raw_content[think_end + 8:].strip()
        else:
            raw_content = re.sub(r'<think>[\s\S]*', '', raw_content).strip()

    content = clean_content(raw_content)

    print(f"  [{label}] content长度: {len(content)}, finish: {finish_reason}, total_tokens: {tokens_used}, completion: {completion_tokens}, reasoning: {reasoning_tokens}")
    print(f"  [{label}] 前200字符: {repr(content[:200])}")

    success = False
    data = {}
    try:
        data = json.loads(content)
        answers = data.get("answers", [])
        summary = data.get("overall_summary", "")
        if len(answers) == total_count and summary:
            received_ids = {ans.get("question_id") for ans in answers}
            expected_ids = {q["id"] for q in MOCK_QUESTIONS}
            if received_ids == expected_ids:
                wrong_with_fb = sum(1 for a in answers if not a.get("is_correct") and a.get("feedback"))
                print(f"  [{label}] ✅ ID全部匹配, 错题feedback: {wrong_with_fb}/{wrong_count}")
                success = True
            else:
                print(f"  [{label}] ❌ ID不匹配")
        else:
            print(f"  [{label}] ❌ answers数量: {len(answers)}/{total_count}, summary: {len(summary)}字符")
    except Exception as e:
        print(f"  [{label}] ❌ JSON解析失败: {e}")
        if content:
            print(f"  [{label}] 尾部200字符: {repr(content[-200:])}")

    duration = time.time() - start_time
    return {
        "label": label,
        "duration": duration,
        "tokens": tokens_used,
        "completion_tokens": completion_tokens,
        "reasoning_tokens": reasoning_tokens,
        "success": success,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "overall_summary": data.get("overall_summary", "") if success else "",
        "finish_reason": finish_reason,
        "content_length": len(content)
    }


async def main():
    print("=" * 90)
    print("最终方案验证：reasoning_split + 仅错题解析 + max_tokens 梯度测试")
    print(f"模型: {settings.OPENAI_MODEL}")
    print(f"API: {settings.OPENAI_BASE_URL}")
    print(f"题目数: {len(MOCK_QUESTIONS)}")
    print("=" * 90)

    client = get_client()
    if not client:
        print("错误: 未配置大模型 API。")
        return

    # 测试矩阵：reasoning_split × max_tokens
    test_cases = [
        ("split+8k",   8192,  True),
        ("split+16k",  16384, True),
        ("nosplit+16k", 16384, False),
    ]

    results = []
    for label, max_tokens, use_split in test_cases:
        print(f"\n{'='*60}")
        print(f"[{label}] max_tokens={max_tokens}, reasoning_split={use_split}")
        print(f"{'='*60}")
        try:
            res = await run_test(client, label, max_tokens, use_split)
            results.append(res)
            print(f"-> {label} 完成！耗时: {res['duration']:.2f}s, 成功: {res['success']}")
        except Exception as e:
            print(f"-> {label} 崩溃: {e}")
            import traceback
            traceback.print_exc()
            results.append({"label": label, "duration": 0, "tokens": 0, "success": False, "finish_reason": "error", "content_length": 0, "completion_tokens": 0, "reasoning_tokens": 0})

    # 输出对比表格
    print("\n" + "=" * 110)
    header = f"{'方案':<18} | {'耗时(s)':<8} | {'总Token':<8} | {'Completion':<11} | {'Reasoning':<10} | {'Content长度':<10} | {'finish':<10} | {'成功':<6}"
    print(header)
    print("-" * 110)
    for r in results:
        row = f"{r['label']:<18} | {r['duration']:<8.1f} | {r['tokens']:<8} | {r.get('completion_tokens',0):<11} | {r.get('reasoning_tokens',0):<10} | {r.get('content_length',0):<10} | {r.get('finish_reason',''):<10} | {str(r['success']):<6}"
        print(row)
    print("=" * 110)

    # 输出成功方案的报告
    for r in results:
        if r.get("success") and r.get("overall_summary"):
            print(f"\n[{r['label']}] 整体报告:")
            print(r["overall_summary"])

    print("\n" + "=" * 110)


if __name__ == "__main__":
    asyncio.run(main())
