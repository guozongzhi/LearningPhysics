# 数据模型规范 (DATAMODEL.md)

所有定义均需使用 **SQLModel**。

## 1. 必需的导入
```python
from typing import Optional, List, Dict
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime
```

## 2. 表结构定义

### `KnowledgeNode` (知识点树状结构)
- **id**: `int` (主键, 自增)
- **name**: `str` (索引=True)
- **code**: `str` (唯一, 例如: "MECH-001")
- **description**: `Optional[str]` (描述)
- **parent_id**: `Optional[int]` (外键指向 `knowledge_nodes.id`)
- **level**: `int` (1=单元, 2=章节, 3=考点)

### `Question` (核心题目表)
- **id**: `uuid.UUID` (主键, 默认值=`uuid4`)
- **content_latex**: `str` (题目正文, Markdown + LaTeX 格式)
- **difficulty**: `int` (1-5)
- **primary_node_id**: `int` (外键指向 `knowledge_nodes.id`)
- **question_type**: `str` (枚举: "CHOICE", "BLANK", "CALCULATION")
- **embedding**: `List[float]`
    - **实现注意:** 必须使用 `sa_column=Column(Vector(1536))` 以适配 OpenAI Embeddings。
- **answer_schema**: `Dict`
    - **实现注意:** 必须使用 `sa_column=Column(JSONB)`。
    - **结构示例:**
      ```json
      {
        "type": "value_unit", 
        "correct_value": 10.5, 
        "unit": "m/s", 
        "tolerance": 0.05 
      }
      ```
- **solution_steps**: `str` (完整解析, Markdown + LaTeX 格式)

### `UserMastery` (学生状态表)
- **user_id**: `uuid.UUID` (外键指向 `users.id`)
- **node_id**: `int` (外键指向 `knowledge_nodes.id`)
- **mastery_score**: `float` (0.0 到 1.0)
- **last_updated**: `datetime`
- **主键:** 复合主键 (`user_id`, `node_id`)

### `ExamRecord` (答题记录表)
- **id**: `uuid.UUID` (主键)
- **user_id**: `uuid.UUID`
- **question_id**: `uuid.UUID`
- **student_input**: `str`
- **is_correct**: `bool`
- **ai_analysis**: `Dict` (JSONB)
    - 存储 LLM 生成的完整分析，解释学生为什么错了。