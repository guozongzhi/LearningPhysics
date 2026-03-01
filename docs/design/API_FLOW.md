# API 接口契约 (API_FLOW.md)

所有接口前缀均为 `/api/v1`。

## 1. 组卷流程 (Quiz Generation Flow)

**接口地址:** `POST /quiz/generate`

**请求参数 (Request):**

```json
{
  "topic_ids": [101, 102],
  "difficulty_preference": "adaptive", 
  "count": 5
}
```

**业务逻辑:**

1.  **检索:** 获取与 `topic_ids` 匹配的题目。
2.  **过滤:** 根据用户当前的掌握度过滤难度 (如果用户系统尚未就绪，使用模拟逻辑)。
3.  **抽取:** 随机选择 `count` 道题目。

**响应结果 (Response):**

```json
{
  "quiz_id": "uuid",
  "questions": [
    {
      "id": "uuid",
      "content_latex": "...",
      "type": "CALCULATION"
      // 注意: 此时不向客户端发送 answer_schema (防止作弊)!
    }
  ]
}
```

## 2. 提交与分析流程 (Submission & Analysis Flow)

**接口地址:** `POST /quiz/submit`

**请求参数 (Request):**

```json
{
  "quiz_id": "uuid",
  "answers": [
    {
      "question_id": "uuid-1",
      "student_input": "5 m/s",
      "time_spent_ms": 12000
    }
  ]
}
```

**响应结果 (Response):**

```json
{
  "total_score": 80,
  "analysis": {
    "uuid-1": {
      "is_correct": false,
      "feedback": "数值正确，但单位错误。加速度的单位应该是 m/s^2。",
      "error_tag": "UNIT_ERROR"
    }
  }
}
```