import json
import random

topics = [
    {"name": "力学", "code": "mechanics", "desc": "涵盖运动学、动力学、功与能、动量及圆周运动等经典力学核心概念。"},
    {"name": "热学", "code": "thermodynamics", "desc": "研究分子热运动、气体实验定律、热力学第一、第二定律及其宏观表现。"},
    {"name": "光学", "code": "optics", "desc": "包括几何光学的反射折射，以及物理光学的干涉、衍射和偏振现象。"},
    {"name": "电磁学", "code": "electromagnetism", "desc": "涵盖电场、磁场、欧姆定律、电磁感应及交流电等核心规律。"},
    {"name": "现代物理", "code": "modern_physics", "desc": "探索原子结构、原子核衰变、光电效应及波粒二象性等量子学起步知识。"}
]

questions = []

# Mechanics Templates
for i in range(21):
    m = random.randint(1, 10)
    F = random.randint(10, 50)
    a = round(F / m, 2)
    q = {
        "topic_code": "mechanics",
        "content_latex": f"一个质量为 $m={m}\\text{{kg}}$ 的物体，受到大小为 $F={F}\\text{{N}}$ 的水平推力作用，在光滑水平面上运动。求物体的加速度 $a$。",
        "difficulty": random.randint(1, 3),
        "question_type": "CALCULATION",
        "answer_schema": {"type": "value_unit", "correct_value": a, "unit": "m/s^2", "tolerance": 0.1},
        "solution_steps": f"由牛顿第二定律 F=ma，得 a = F/m = {F}/{m} = {a} m/s²"
    }
    questions.append(q)

# Thermodynamics Templates
for i in range(21):
    P1 = random.choice([1.0, 1.5, 2.0]) * 1e5
    V1 = random.randint(2, 5)
    V2 = random.randint(1, V1-1)
    P2 = round(P1 * V1 / V2, 2)
    q = {
        "topic_code": "thermodynamics",
        "content_latex": f"一定质量的理想气体，恒温下压力为 $P_1={P1:g}\\text{{Pa}}$ 时体积为 $V_1={V1}\\text{{L}}$。若体积缩为 $V_2={V2}\\text{{L}}$，求压力 $P_2$。",
        "difficulty": random.randint(1, 3),
        "question_type": "CALCULATION",
        "answer_schema": {"type": "value_unit", "correct_value": P2, "unit": "Pa", "tolerance": 0.1e5},
        "solution_steps": f"由 P₁V₁=P₂V₂，得 P₂ = {P1:g} × {V1} / {V2} = {P2:g} Pa"
    }
    questions.append(q)

# Optics Templates
for i in range(21):
    n_val = random.choice([1.5, 2.0, 2.5])
    c = 3e8
    v = round(c / n_val, 2)
    q = {
        "topic_code": "optics",
        "content_latex": f"某介质的折射率为 $n={n_val}$。求光在此介质中传播的速度 $v$ (已知 $c=3\\times10^8\\text{{m/s}}$)。",
        "difficulty": random.randint(1, 2),
        "question_type": "CALCULATION",
        "answer_schema": {"type": "value_unit", "correct_value": v, "unit": "m/s", "tolerance": 0.1e8},
        "solution_steps": f"v = c/n = 3e8 / {n_val} = {v:g} m/s"
    }
    questions.append(q)

# Electromagnetism Templates
for i in range(21):
    I = random.randint(1, 10)
    B = random.choice([0.1, 0.2, 0.5])
    L = random.choice([0.2, 0.5, 1.0])
    F = round(B * I * L, 3)
    q = {
        "topic_code": "electromagnetism",
        "content_latex": f"通电导线长 ${L}\\text{{m}}, I={I}\\text{{A}}, B={B}\\text{{T}}$ 垂直。求安培力。",
        "difficulty": random.randint(1, 2),
        "question_type": "CALCULATION",
        "answer_schema": {"type": "value_unit", "correct_value": F, "unit": "N", "tolerance": 0.01},
        "solution_steps": f"F = BIL = {B} × {I} × {L} = {F} N"
    }
    questions.append(q)

# Modern Physics Templates
for i in range(21):
    W = random.choice([2.0, 2.2, 2.5])
    E = random.choice([3.0, 3.5, 4.0])
    Ek = round(E - W, 2)
    q = {
        "topic_code": "modern_physics",
        "content_latex": f"金属逸出功 ${W}\\text{{eV}}$，用 ${E}\\text{{eV}}$ 光子照射。求光电子最大初动能。",
        "difficulty": random.randint(1, 2),
        "question_type": "CALCULATION",
        "answer_schema": {"type": "value_unit", "correct_value": Ek, "unit": "eV", "tolerance": 0.1},
        "solution_steps": f"Ek = hv - W = {E} - {W} = {Ek} eV"
    }
    questions.append(q)

data = {
    "knowledge_nodes": [
        {"id": t["id"], "name": t["name"], "code": t["code"], "level": 1, "description": t["desc"]} 
        for t in topics 
        for t in [{"id": i+1, **topics[i]} for i in range(len(topics))]
    ][:5],
    "questions": questions
}

with open("data/questions.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print(f"Generated {len(questions)} questions.")
