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
from app.services.quiz_service import get_client, _evaluate_answer, AnalysisResult
from app.models.models import Question, User
from app.schemas.quiz import StudentAnswer

# 20 道内置的高中物理题目及学生模拟作答（由 10 道原题复制并重编号生成）
BASE_QUESTIONS = [
    {
        "question_type": "SINGLE_CHOICE",
        "content_latex": "一质量为2kg的物体以10m/s的速度做匀速直线运动，其动能为多少？",
        "solution_steps": "根据动能公式 E_k = 0.5 * m * v^2，代入数据得 E_k = 0.5 * 2 * 10^2 = 100 J。",
        "answer_schema": {"type": "single_choice", "correct_answer": "B", "options": [
            {"label": "A", "text": "50 J"},
            {"label": "B", "text": "100 J"},
            {"label": "C", "text": "200 J"},
            {"label": "D", "text": "400 J"}
        ]},
        "student_input": "B"
    },
    {
        "question_type": "SINGLE_CHOICE",
        "content_latex": "关于冲量和动量，下列说法正确的是：",
        "solution_steps": "根据动量定理，物体所受合外力的冲量等于其动量的变化量。冲量是力在时间上的累积效应，动量是状态量。",
        "answer_schema": {"type": "single_choice", "correct_answer": "C", "options": [
            {"label": "A", "text": "冲量大的物体动量一定大"},
            {"label": "B", "text": "动量大的物体受到的冲量一定大"},
            {"label": "C", "text": "合外力的冲量等于物体动量的变化量"},
            {"label": "D", "text": "冲量和动量都是状态量"}
        ]},
        "student_input": "A"
    },
    {
        "question_type": "BLANK",
        "content_latex": "一质点在半径为r=2m的圆轨道上做匀速圆周运动，线速度大小为v=4m/s，则其向心加速度大小为______ m/s^2。",
        "solution_steps": "根据向心加速度公式 a = v^2 / r，代入数据得 a = 4^2 / 2 = 8 m/s^2。",
        "answer_schema": {"type": "blank", "correct_answer": "8"},
        "student_input": "16"
    },
    {
        "question_type": "CALCULATION",
        "content_latex": "理想变压器原副线圈匝数比为 n1:n2 = 5:1，原线圈输入电压为 220V，则副线圈输出电压为多少伏？",
        "solution_steps": "根据理想变压器电压比公式 U1/U2 = n1/n2，得 U2 = U1 * (n2/n1) = 220 * (1/5) = 44 V。",
        "answer_schema": {"type": "value_unit", "correct_value": "44", "unit": "V", "tolerance": 0.5},
        "student_input": "44"
    },
    {
        "question_type": "TRUE_FALSE",
        "content_latex": "只有重力或弹力做功时，物体的机械能守恒。该说法是否正确？",
        "solution_steps": "机械能守恒的条件是只有重力或系统内弹力做功。其他力不做功或做功之和为零。此说法正确。",
        "answer_schema": {"type": "true_false", "correct_answer": "true"},
        "student_input": "true"
    },
    {
        "question_type": "BLANK",
        "content_latex": "当物体受到的合外力不足以提供其做圆周运动所需的向心力时，物体将做______运动。",
        "solution_steps": "当合外力不足以提供向心力时，物体偏离圆轨道，向外滑行，这种运动称为离心运动。",
        "answer_schema": {"type": "blank", "correct_answer": "离心"},
        "student_input": "离心"
    },
    {
        "question_type": "CALCULATION",
        "content_latex": "一定质量的理想气体，在压强保持不变时，温度从 27℃ 升高到 327℃，体积变为原来的多少倍？",
        "solution_steps": "根据盖-吕萨克定律 V1/T1 = V2/T2。注意温度需转化为热力学温度：T1 = 27 + 273 = 300K，T2 = 327 + 273 = 600K。故 V2/V1 = T2/T1 = 600/300 = 2倍。",
        "answer_schema": {"type": "value_unit", "correct_value": "2", "unit": "倍", "tolerance": 0.05},
        "student_input": "12.1"
    },
    {
        "question_type": "SINGLE_CHOICE",
        "content_latex": "温度是物体分子______的标志。",
        "solution_steps": "宏观上温度反映物体的冷热程度，微观上温度是分子平均动能的标志。注意是分子平均动能，而非平均速率或总动能。",
        "answer_schema": {"type": "single_choice", "correct_answer": "B", "options": [
            {"label": "A", "text": "平均速率"},
            {"label": "B", "text": "平均动能"},
            {"label": "C", "text": "总动能"},
            {"label": "D", "text": "平均速度"}
        ]},
        "student_input": "C"
    },
    {
        "question_type": "CALCULATION",
        "content_latex": "一质量为4kg的物体在光滑水平面上受到 F=8N 的水平拉力作用，其加速度大小为多少？",
        "solution_steps": "根据牛顿第二定律 F = m * a，得 a = F / m = 8 / 4 = 2 m/s^2。",
        "answer_schema": {"type": "value_unit", "correct_value": "2", "unit": "m/s^2", "tolerance": 0.05},
        "student_input": "2 m/s^2"
    },
    {
        "question_type": "BLANK",
        "content_latex": "功和能量的国际单位制单位是______。",
        "solution_steps": "在国际单位制中，功 and 能量的单位都是焦耳，符号为J。",
        "answer_schema": {"type": "blank", "correct_answer": "焦耳"},
        "student_input": "焦耳"
    }
]

# 自动生成 20 道题，带唯一的 UUID ID
MOCK_QUESTIONS = []
for i in range(20):
    base = BASE_QUESTIONS[i % 10]
    q = base.copy()
    # 模拟不同的 UUID 作为 question_id
    q["id"] = f"00000000-0000-0000-0000-{i+1:012d}"
    # 把题目的题干稍微加点序号区别开
    q["content_latex"] = f"({i+1}) {base['content_latex']}"
    MOCK_QUESTIONS.append(q)

def clean_think_tag(content: str) -> str:
    """提取大模型可能输出的思维推理段，并截断它"""
    if "<think>" in content:
        think_end = content.find("</think>")
        if think_end != -1:
            content = content[think_end + 8:].strip()
        else:
            content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()
            content = re.sub(r'<think>[\s\S]*', '', content).strip()
    return content

def format_correct_answer(q: Dict[str, Any]) -> str:
    ans_schema = q.get("answer_schema") or {}
    q_type = q.get("question_type")
    if q_type in ["CHOICE", "SINGLE_CHOICE"]:
        correct_answer_str = f"正确选项是: {ans_schema.get('correct_answer')}"
        if "options" in ans_schema:
            options_str = "\n".join([f"{o['label']}: {o['text']}" for o in ans_schema["options"]])
            correct_answer_str += f"\n选项列表:\n{options_str}"
        return correct_answer_str
    elif q_type == "MULTIPLE_CHOICE":
        correct_answer_str = f"正确选项是: {', '.join(ans_schema.get('correct_answers', []))}"
        if "options" in ans_schema:
            options_str = "\n".join([f"{o['label']}: {o['text']}" for o in ans_schema["options"]])
            correct_answer_str += f"\n选项列表:\n{options_str}"
        return correct_answer_str
    elif q_type == "TRUE_FALSE":
        val = "正确" if str(ans_schema.get("correct_answer")).lower() == "true" else "错误"
        return f"正确答案是: {val}"
    elif q_type == "BLANK":
        return f"正确填空内容是: {ans_schema.get('correct_answer')}"
    elif q_type == "CALCULATION":
        return f"正确数值: {ans_schema.get('correct_value')}, 单位: {ans_schema.get('unit')}"
    return ""

async def _get_ai_feedback_mock(q: Dict[str, Any], is_correct: bool, client) -> tuple[Dict[str, Any], int]:
    """单题评估"""
    correct_str = format_correct_answer(q)
    status_str = "正确回答" if is_correct else "错误回答"
    action_text = "肯定学生的表现并深化理解" if is_correct else "分析错误原因（如概念混淆、计算失误等）并给出指引"
    
    prompt = f"""你是一位资深高中物理教师。一位学生{status_str}了以下题目，请给出详细的解析。

--- 题目 ---
{q['content_latex']}

--- 正确答案信息 ---
{correct_str}

--- 参考解题步骤 ---
{q['solution_steps']}

--- 学生的答案 ---
{q['student_input']}

请用中文写出详细的解析（3-5句话），包含：
1. {action_text}
2. 详细的物理思路和关联的知识点
3. 如果是多选题或单选题，请解释为什么选项正确或错误
4. 鼓励性的结尾

以 JSON 格式返回，包含 "feedback" 和 "error_tag" 两个字段。
如果回答正确，error_tag 固定为 "CORRECT"。
如果回答错误，从以下选项中选一个最贴切的 error_tag：[VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR]
不要包含 markdown 格式或其他多余的文本。"""

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        timeout=30.0
    )
    content = clean_think_tag(response.choices[0].message.content.strip())
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()
    
    data = json.loads(content)
    tokens = response.usage.total_tokens if response.usage else 0
    return data, tokens

async def _get_ai_summary_mock(correct_count: int, total_count: int, wrong_details: List[str], client) -> tuple[str, int]:
    """综合评价报告"""
    details_str = "\n".join(wrong_details) if wrong_details else "全部正确！"
    score = int(correct_count / total_count * 100)
    
    summary_prompt = f"""你是一位资深高中物理教师。一位学生刚完成了一次物理测验。
测验结果：答对 {correct_count}/{total_count} 题，得分 {score} 分。

错题详情：
{details_str}

请用中文写一段简短的整体分析报告（3-5句话），包含：
1. 对学生表现的整体评价
2. 薄弱知识点分析（如果有错题）
3. 具体的学习建议

不要使用 markdown 格式，直接输出纯文本。"""

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": summary_prompt}],
        temperature=0.7,
        max_tokens=300,
        timeout=30.0
    )
    content = clean_think_tag(response.choices[0].message.content.strip())
    tokens = response.usage.total_tokens if response.usage else 0
    return content, tokens

# =========================================================================
# 方案 A：分步限流并行方案 (20道题，Semaphore = 2)
# =========================================================================
async def run_scheme_a(client) -> Dict[str, Any]:
    start_time = time.time()
    sem = asyncio.Semaphore(2)
    
    async def task_with_sem(q: Dict[str, Any], is_correct: bool):
        async with sem:
            return await _get_ai_feedback_mock(q, is_correct, client)
            
    tasks = []
    correct_count = 0
    wrong_details = []
    
    for q in MOCK_QUESTIONS:
        is_correct = _evaluate_answer(q["student_input"], q["answer_schema"])
        if is_correct:
            correct_count += 1
        tasks.append(task_with_sem(q, is_correct))
        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    tokens_used = 0
    single_feedbacks = []
    for idx, res in enumerate(results):
        if isinstance(res, Exception):
            print(f"[Scheme A] Question {idx+1} failed: {res}")
            continue
        data, t = res
        tokens_used += t
        single_feedbacks.append(data)
        
        is_correct = _evaluate_answer(MOCK_QUESTIONS[idx]["student_input"], MOCK_QUESTIONS[idx]["answer_schema"])
        if not is_correct:
            wrong_details.append(f"- 题目: {MOCK_QUESTIONS[idx]['content_latex'][:30]}，学生答: {MOCK_QUESTIONS[idx]['student_input']}，错误类型: {data.get('error_tag')}")
            
    summary_text, summary_tokens = await _get_ai_summary_mock(correct_count, len(MOCK_QUESTIONS), wrong_details, client)
    tokens_used += summary_tokens
    
    duration = time.time() - start_time
    return {
        "duration": duration,
        "tokens": tokens_used,
        "success": len(single_feedbacks) == len(MOCK_QUESTIONS) and len(summary_text) > 0,
        "overall_summary": summary_text
    }

# =========================================================================
# 方案 B：20题一次性打包合并方案 (观察是否会超出最大Token限制或失败)
# =========================================================================
async def run_scheme_b(client) -> Dict[str, Any]:
    start_time = time.time()
    
    items_list = []
    for idx, q in enumerate(MOCK_QUESTIONS):
        is_correct = _evaluate_answer(q["student_input"], q["answer_schema"])
        correct_str = format_correct_answer(q)
        items_list.append(f"""[题号 {idx + 1}]
- 题目 ID: {q['id']}
- 题干: {q['content_latex']}
- 标准答案信息: {correct_str}
- 参考步骤: {q['solution_steps']}
- 学生作答: {q['student_input']}
- 系统初步判定对错: {"正确" if is_correct else "错误"}
------------------------""")

    all_items_str = "\n".join(items_list)

    prompt = f"""你是一位资深高中物理教师。以下是一位学生刚完成的物理测验，共包含了 20 道题目。
请对每道题目学生的答案进行批改和解析，并给出整份测验的综合评估。

--- 题目列表与作答详情 ---
{all_items_str}

请以严格的 JSON 格式返回，包含：
1. "answers": 列表，每个元素对应一道题的评估，必须包含 "question_id"、"is_correct"（布尔值）、"feedback"（中文解析 3-5 句）和 "error_tag"（若系统判定错，从 [VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR] 中选择最贴切的一个，正确则为 CORRECT）。
2. "overall_summary": 纯文本，3-5句中文，对测验的整体评价、薄弱点和具体的物理建议，不要包含 markdown 标签。

注意：直接输出合法 JSON，不要加 ```json 标签。question_id 必须与输入的题目 ID 完全对应。"""

    # 由于 20 题输出很大，设置 max_tokens = 4000
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=4000,
        timeout=60.0  # 给更多的超时时间以应对大吞吐
    )
    
    content = clean_think_tag(response.choices[0].message.content.strip())
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()
        
    tokens_used = response.usage.total_tokens if response.usage else 0
    
    success = False
    data = {}
    try:
        data = json.loads(content)
        if "answers" in data and len(data["answers"]) == len(MOCK_QUESTIONS) and "overall_summary" in data:
            received_ids = {ans.get("question_id") for ans in data["answers"]}
            expected_ids = {q["id"] for q in MOCK_QUESTIONS}
            if received_ids == expected_ids:
                success = True
            else:
                print(f"[Scheme B] ID mismatch. Expected: {expected_ids}, Got: {received_ids}")
        else:
            print(f"[Scheme B] JSON structure incomplete. Answers count: {len(data.get('answers', []))}")
    except Exception as e:
        print(f"[Scheme B] JSON Parse error: {e}. Content: {content[:300]}...")
        
    duration = time.time() - start_time
    return {
        "duration": duration,
        "tokens": tokens_used,
        "success": success,
        "overall_summary": data.get("overall_summary", "") if success else ""
    }

# =========================================================================
# 方案 D：动态分批打包方案 (每 8 题一包，20 道题分 3 个 Batch，Semaphore=2)
# =========================================================================
async def run_scheme_d(client) -> Dict[str, Any]:
    start_time = time.time()
    
    # 将 20 题分成 [8, 8, 4] 三组
    batch_size = 8
    chunks = [MOCK_QUESTIONS[i:i + batch_size] for i in range(0, len(MOCK_QUESTIONS), batch_size)]
    
    tokens_used = 0
    all_answers = []
    wrong_details = []
    
    sem = asyncio.Semaphore(2)
    
    async def evaluate_chunk(chunk: List[Dict[str, Any]], chunk_idx: int) -> tuple[List[Dict[str, Any]], int]:
        async with sem:
            items_list = []
            for idx, q in enumerate(chunk):
                is_correct = _evaluate_answer(q["student_input"], q["answer_schema"])
                correct_str = format_correct_answer(q)
                items_list.append(f"""[题号 {chunk_idx * batch_size + idx + 1}]
- 题目 ID: {q['id']}
- 题干: {q['content_latex']}
- 标准答案信息: {correct_str}
- 参考步骤: {q['solution_steps']}
- 学生作答: {q['student_input']}
- 系统初步判定对错: {"正确" if is_correct else "错误"}
------------------------""")

            chunk_items_str = "\n".join(items_list)

            prompt = f"""你是一位资深高中物理教师。以下是一个测验中的 {len(chunk)} 道题目。
请对每道题目学生的答案进行批改和解析。

--- 题目列表与作答详情 ---
{chunk_items_str}

请以严格的 JSON 格式返回一个包含 "answers" 字段的对象。
"answers" 是一个列表，每个元素对应一道题的评估，必须包含 "question_id"、"is_correct"（布尔值）、"feedback"（中文解析 3-5 句）和 "error_tag"（若系统判定错，从 [VALUE_ERROR, UNIT_ERROR, CALCULATION_ERROR, CONCEPT_ERROR, FORMAT_ERROR] 中选择，正确则为 CORRECT）。

注意：直接输出合法 JSON，不要加 ```json 标签。且 question_id 必须与输入的题目 ID 完全对应。"""

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=2500,
                timeout=45.0
            )
            content = clean_think_tag(response.choices[0].message.content.strip())
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
                
            data = json.loads(content)
            t = response.usage.total_tokens if response.usage else 0
            return data.get("answers", []), t

    # 并发执行这 3 个 Chunk
    tasks = [evaluate_chunk(chunk, idx) for idx, chunk in enumerate(chunks)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    chunk_success = True
    for idx, res in enumerate(results):
        if isinstance(res, Exception):
            print(f"[Scheme D] Chunk {idx+1} failed: {res}")
            chunk_success = False
            continue
        answers_list, t = res
        tokens_used += t
        all_answers.extend(answers_list)
        
    # 验证 ID 对应
    id_match = False
    if len(all_answers) == len(MOCK_QUESTIONS):
        received_ids = {ans.get("question_id") for ans in all_answers}
        expected_ids = {q["id"] for q in MOCK_QUESTIONS}
        if received_ids == expected_ids:
            id_match = True
            
    summary_text = ""
    if chunk_success and id_match:
        correct_count = 0
        for ans in all_answers:
            q_id = ans.get("question_id")
            q = next(x for x in MOCK_QUESTIONS if x["id"] == q_id)
            is_correct = ans.get("is_correct", False)
            if is_correct:
                correct_count += 1
            else:
                wrong_details.append(f"- 题目: {q['content_latex'][:30]}，学生答: {q['student_input']}，错误类型: {ans.get('error_tag')}")
                
        # 最后的综合汇总评估
        summary_text, summary_tokens = await _get_ai_summary_mock(correct_count, len(MOCK_QUESTIONS), wrong_details, client)
        tokens_used += summary_tokens
        
    duration = time.time() - start_time
    return {
        "duration": duration,
        "tokens": tokens_used,
        "success": chunk_success and id_match and len(summary_text) > 0,
        "overall_summary": summary_text
    }

async def main():
    print("=" * 80)
    print("开始 20 道物理题目(多于10题场景) AI 评估优化对比测试 (开发测试)")
    print(f"当前 API 模型配置: {settings.OPENAI_MODEL}")
    print(f"API 节点地址: {settings.OPENAI_BASE_URL}")
    print("=" * 80)
    
    client = get_client()
    if not client:
        print("错误: 未配置大模型 API，请检查环境变量。")
        return
        
    # 1. 运行方案 A
    print("\n[方案 A] 启动：分步限流并行评估 (Semaphore=2) ...")
    try:
        res_a = await run_scheme_a(client)
        print(f"-> 方案 A 完成！耗时: {res_a['duration']:.2f}s, Token: {res_a['tokens']}, 成功率: {res_a['success']}")
    except Exception as e:
        print(f"-> 方案 A 执行崩溃: {e}")
        res_a = {"duration": 0, "tokens": 0, "success": False}
        
    # 2. 运行方案 B
    print("\n[方案 B] 启动：20 题一次性打包合并评估 (观察是否被截断) ...")
    try:
        res_b = await run_scheme_b(client)
        print(f"-> 方案 B 完成！耗时: {res_b['duration']:.2f}s, Token: {res_b['tokens']}, 成功率: {res_b['success']}")
    except Exception as e:
        print(f"-> 方案 B 执行崩溃: {e}")
        res_b = {"duration": 0, "tokens": 0, "success": False}

    # 3. 运行方案 D
    print("\n[方案 D] 启动：动态分批打包评估 (每 8 题一包) ...")
    try:
        res_d = await run_scheme_d(client)
        print(f"-> 方案 D 完成！耗时: {res_d['duration']:.2f}s, Token: {res_d['tokens']}, 成功率: {res_d['success']}")
    except Exception as e:
        print(f"-> 方案 D 执行崩溃: {e}")
        res_d = {"duration": 0, "tokens": 0, "success": False}

    # 输出性能对比表格
    print("\n" + "=" * 85)
    print(f"{'方案名称':<30} | {'总耗时(秒)':<10} | {'消耗Token数':<12} | {'API请求数':<10} | {'执行成功':<8}")
    print("-" * 85)
    print(f"{'方案 A (分步并行 Semaphore=2)':<30} | {res_a['duration']:<10.2f} | {res_a['tokens']:<12} | {'21':<10} | {str(res_a['success']):<8}")
    print(f"{'方案 B (20 题一次打包合并)':<30} | {res_b['duration']:<10.2f} | {res_b['tokens']:<12} | {'1':<10} | {str(res_b['success']):<8}")
    print(f"{'方案 D (动态分批打包 - 8题一包)':<30} | {res_d['duration']:<10.2f} | {res_d['tokens']:<12} | {'4':<10} | {str(res_d['success']):<8}")
    print("=" * 85)
    
    print("\n[方案 B 评估总结报告示例]:")
    print(res_b.get("overall_summary") or "N/A")
    print("\n[方案 D 评估总结报告示例]:")
    print(res_d.get("overall_summary") or "N/A")
    print("=" * 85)

if __name__ == "__main__":
    asyncio.run(main())
