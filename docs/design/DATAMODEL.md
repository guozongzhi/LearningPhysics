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
- **user_id**: `uuid.UUID` (外键指向 `users.id`)
- **question_id**: `uuid.UUID` (外键指向 `questions.id`)
- **student_input**: `str` (学生提交的答案)
- **is_correct**: `bool` (是否答对)
- **ai_analysis**: `Dict` (JSONB)
    - 存储 LLM 生成的完整分析，解释学生为什么错了。
- **created_at**: `datetime` (答题时间)

---

## 3. 补充表结构定义

### `User` (用户表)
- **id**: `uuid.UUID` (主键, 默认值=`uuid4`)
- **email**: `str` (唯一, 索引=True)
- **username**: `str` (唯一, 索引=True)
- **hashed_password**: `str` (加密后的密码)
- **is_active**: `bool` (是否激活, 默认=True)
- **is_admin**: `bool` (是否是管理员, 默认=False)
- **token_usage**: `int` (已使用token数量, 默认=0)
- **token_limit**: `int` (token限额, 默认=100000)
- **created_at**: `datetime` (创建时间)
- **updated_at**: `datetime` (更新时间)

### `TopicDocument` (学习文档表)
- **id**: `uuid.UUID` (主键, 默认值=`uuid4`)
- **title**: `str` (文档标题, 索引=True)
- **summary**: `Optional[str]` (文档摘要)
- **content_markdown**: `str` (文档内容, Markdown格式)
- **content_blocks**: `Optional[List[Dict]]` (BlockNote格式内容, JSONB)
- **whiteboard_data**: `Optional[Dict]` (白板数据, JSONB)
- **owner_id**: `uuid.UUID` (外键指向 `users.id`, 索引=True)
- **visibility**: `str` (可见性: private/public, 默认=private)
- **is_archived**: `bool` (是否归档, 默认=False)
- **is_template**: `bool` (是否是模板, 默认=False)
- **created_at**: `datetime` (创建时间)
- **updated_at**: `datetime` (更新时间)

### `TopicDocumentNode` (文档-知识点关联表)
- **document_id**: `uuid.UUID` (外键指向 `topic_documents.id`)
- **node_id**: `int` (外键指向 `knowledge_nodes.id`)
- **主键:** 复合主键 (`document_id`, `node_id`)

### `TopicDocumentCollaborator` (文档协作者表)
- **document_id**: `uuid.UUID` (外键指向 `topic_documents.id`)
- **user_id**: `uuid.UUID` (外键指向 `users.id`)
- **role**: `str` (角色: viewer/editor/owner, 默认=viewer)
- **invited_at**: `datetime` (邀请时间)
- **主键:** 复合主键 (`document_id`, `user_id`)

### `TopicDocumentVersion` (文档版本表)
- **id**: `uuid.UUID` (主键, 默认值=`uuid4`)
- **document_id**: `uuid.UUID` (外键指向 `topic_documents.id`, 索引=True)
- **version_no**: `int` (版本号, 默认=1)
- **title**: `str` (版本标题)
- **content_markdown**: `str` (版本内容)
- **content_blocks**: `Optional[List[Dict]]` (BlockNote格式内容, JSONB)
- **whiteboard_data**: `Optional[Dict]` (白板数据, JSONB)
- **edited_by**: `uuid.UUID` (外键指向 `users.id`)
- **created_at**: `datetime` (版本创建时间)

### `TopicDocumentActivity` (文档活动日志表)
- **id**: `uuid.UUID` (主键, 默认值=`uuid4`)
- **document_id**: `uuid.UUID` (外键指向 `topic_documents.id`, 索引=True)
- **user_id**: `uuid.UUID` (外键指向 `users.id`)
- **action**: `str` (操作类型: created/updated/collaborator_added等)
- **detail**: `Optional[str]` (操作详情)
- **created_at**: `datetime` (操作时间)

### `Media` (媒体文件表)
- **id**: `uuid.UUID` (主键, 默认值=`uuid4`)
- **filename**: `str` (文件名)
- **content_type**: `str` (MIME类型)
- **data**: `bytes` (文件二进制内容)
- **owner_id**: `uuid.UUID` (外键指向 `users.id`, 索引=True)
- **created_at**: `datetime` (上传时间)

---

## 4. 表关系与ER图

### 核心关系说明
1. **用户 - 知识点掌握度**: 一对多关系，一个用户可以有多个知识点的掌握度记录
2. **用户 - 答题记录**: 一对多关系，一个用户可以有多个答题记录
3. **用户 - 文档**: 一对多关系，一个用户可以创建多个文档
4. **知识点 - 题目**: 一对多关系，一个知识点下可以有多个题目
5. **知识点 - 用户掌握度**: 一对多关系，一个知识点可以被多个用户掌握
6. **题目 - 答题记录**: 一对多关系，一个题目可以被多个用户回答
7. **文档 - 知识点**: 多对多关系，一个文档可以关联多个知识点，一个知识点可以被多个文档引用
8. **文档 - 协作者**: 多对多关系，一个文档可以有多个协作者，一个用户可以协作多个文档

### ER图概览
```
User ──< UserMastery >── KnowledgeNode ──< Question ──< ExamRecord >── User
│                                                         ^
│                                                         │
└──< TopicDocument >──< TopicDocumentNode >───────────────┘
       │
       ├──< TopicDocumentCollaborator >── User
       ├──< TopicDocumentVersion >
       └──< TopicDocumentActivity >── User
```

---

## 5. 索引设计规范

### 必建索引
1. **主键索引**: 所有表主键自动创建索引
2. **外键索引**: 所有外键字段必须创建索引
3. **唯一索引**: 具有唯一约束的字段（如email、username、code）自动创建唯一索引
4. **查询常用字段**:
   - `questions.difficulty`: 按难度筛选题目
   - `questions.primary_node_id`: 按知识点筛选题目
   - `exam_records.user_id`: 查询用户答题记录
   - `user_mastery.user_id`: 查询用户知识点掌握度
   - `topic_documents.owner_id`: 查询用户创建的文档

### 向量索引
对于`questions.embedding`向量字段，创建HNSW索引以支持高效的相似度查询：
```sql
CREATE INDEX ON questions USING hnsw (embedding vector_cosine_ops);
```

---

## 6. 数据迁移与备份策略

### 数据迁移
1. 使用`alembic`作为数据库迁移工具
2. 所有表结构变更必须创建迁移脚本
3. 迁移脚本必须支持回滚操作
4. 生产环境迁移前必须在测试环境验证通过

### 数据备份
1. 每日全量备份数据库，保留30天
2. 每小时增量备份事务日志，保留7天
3. 备份文件异地存储
4. 每月进行一次恢复演练，确保备份可用

---

## 7. 字段约束规范

### 通用约束
- **字符串字段**: 明确长度限制，避免使用无限制的text类型（除非确实需要）
- **数字字段**: 明确取值范围，使用check约束确保数据合法性
- **枚举字段**: 使用字符串类型存储枚举值，避免使用数据库枚举类型（便于扩展）
- **时间字段**: 统一使用北京时间（UTC+8），不带时区信息

### 示例约束
- `difficulty`字段: 1 ≤ difficulty ≤ 5
- `mastery_score`字段: 0.0 ≤ mastery_score ≤ 1.0
- `email`字段: 符合邮箱格式规范
- `username`字段: 4-20位，支持字母、数字、下划线