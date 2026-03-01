import os
import json
import asyncio
import openai
import uuid
import re
from typing import List, Dict, Any

# --- Configuration ---
API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = os.getenv("OPENAI_BASE_URL")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
QUESTIONS_FILE = "data/questions.json"

client = None
if API_KEY:
    kwargs = {"api_key": API_KEY}
    if BASE_URL:
        kwargs["base_url"] = BASE_URL
    client = openai.AsyncClient(**kwargs)

TOPICS = [
    {"name": "力学", "code": "mechanics"},
    {"name": "热学", "code": "thermodynamics"},
    {"name": "光学", "code": "optics"},
    {"name": "电磁学", "code": "electromagnetism"},
    {"name": "现代物理", "code": "modern_physics"}
]

PROMPT_TEMPLATE = """你是一位资深高中物理教师，请为物理智能学习系统编写一批高质量的题目。
主题：{topic_name} (代码: {topic_code})
要求：
1. 生成 {count} 道题目。
2. 包含不同难度（1到5级）。
3. 题目采用 LaTeX 格式编写公式。
4. 题型必须为计算题 (CALCULATION)。
5. 答案模式必须为 "value_unit"。
6. 请以 JSON 数组格式返回，不要有任何多余的文字。

JSON 结构示例：
[
    {{
        "topic_code": "{topic_code}",
        "content_latex": "题目文本 $公式$",
        "difficulty": 3,
        "question_type": "CALCULATION",
        "answer_schema": {{
            "type": "value_unit",
            "correct_value": 10.5,
            "unit": "m/s",
            "tolerance": 0.1
        }},
        "solution_steps": "详细解题步骤..."
    }}
]
"""

async def generate_chunk(topic: Dict[str, str], count: int) -> List[Dict[str, Any]]:
    if not client:
        print("Error: AI client not configured.")
        return []
    
    prompt = PROMPT_TEMPLATE.format(
        topic_name=topic["name"],
        topic_code=topic["code"],
        count=count
    )
    
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} if "gpt-4" in MODEL or "gpt-3.5" in MODEL else None,
            temperature=0.7
        )
        content = response.choices[0].message.content
        # Try to find JSON if not strictly json_object
        if "```json" in content:
            content = re.search(r"```json\n([\s\S]*?)\n```", content).group(1)
            
        data = json.loads(content)
        # Handle cases where it returns {"questions": [...]} or just [...]
        if isinstance(data, dict):
            for key in ["questions", "data", "items"]:
                if key in data and isinstance(data[key], list):
                    return data[key]
            return []
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error generating for {topic['code']}: {e}")
        return []

async def main():
    if not os.path.exists(QUESTIONS_FILE):
        print(f"Error: {QUESTIONS_FILE} not found.")
        return

    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        full_data = json.load(f)

    existing_count = len(full_data.get("questions", []))
    target_total = 110
    to_generate = target_total - existing_count
    
    if to_generate <= 0:
        print(f"Current count {existing_count} already meets target {target_total}.")
        return

    print(f"Current questions: {existing_count}. Generating {to_generate} more...")

    # Share generation across topics
    per_topic = (to_generate // len(TOPICS)) + 1
    
    all_new_questions = []
    
    # We'll do it in batches of 10 to avoid token limits
    tasks = []
    for topic in TOPICS:
        # Generate in small chunks to be safe
        num_to_gen = per_topic
        while num_to_gen > 0:
            chunk_size = min(10, num_to_gen)
            tasks.append(generate_chunk(topic, chunk_size))
            num_to_gen -= chunk_size

    results = await asyncio.gather(*tasks)
    for res in results:
        all_new_questions.extend(res)

    # Sanitize and limit
    final_new = []
    for q in all_new_questions:
        if "topic_code" in q and "content_latex" in q:
            final_new.append(q)
    
    full_data["questions"].extend(final_new[:to_generate])
    
    with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(full_data, f, ensure_ascii=False, indent=4)

    print(f"Done! Total questions in {QUESTIONS_FILE}: {len(full_data['questions'])}")

if __name__ == "__main__":
    asyncio.run(main())
