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

---

## 3. 通用规范

### 3.1 错误码规范
所有接口统一使用HTTP状态码 + 业务错误码的格式：

| HTTP状态码 | 业务错误码 | 说明 |
|-----------|-----------|------|
| 200 | SUCCESS | 请求成功 |
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未认证或token无效 |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（如用户已存在） |
| 429 | TOO_MANY_REQUESTS | 请求频率超限 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

错误响应格式：
```json
{
  "detail": "错误描述信息",
  "code": "业务错误码"
}
```

### 3.2 认证机制
所有需要认证的接口必须在请求头中携带：
```
Authorization: Bearer <JWT_TOKEN>
```
JWT Token有效期为24小时，过期后需要重新登录获取。

### 3.3 版本管理
- 当前API版本：v1
- 接口前缀：`/api/v1`
- 后续版本升级将通过修改前缀实现，如`/api/v2`，保持旧版本兼容

### 3.4 限流策略
- 普通用户：100次/分钟
- 管理员用户：1000次/分钟
- 超出限制返回429状态码

---

## 4. 认证接口 (Auth)

### 4.1 用户注册
**接口地址:** `POST /auth/register`
**权限:** 公开

**请求参数:**
```json
{
  "email": "user@example.com",
  "username": "student1",
  "password": "Password123!"
}
```

**响应结果:**
```json
{
  "access_token": "jwt_token_string",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "student1",
    "is_admin": false
  }
}
```

### 4.2 用户登录
**接口地址:** `POST /auth/login`
**权限:** 公开

**请求参数:**
```json
{
  "username": "student1",
  "password": "Password123!"
}
```

**响应结果:** 同注册接口

### 4.3 获取当前用户信息
**接口地址:** `GET /auth/me`
**权限:** 已认证用户

**响应结果:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "student1",
  "is_admin": false,
  "token_usage": 1250,
  "token_limit": 100000,
  "created_at": "2024-01-01T12:00:00"
}
```

---

## 5. 用户管理接口 (Users)

### 5.1 获取用户学习进度
**接口地址:** `GET /users/progress`
**权限:** 已认证用户

**响应结果:**
```json
{
  "mastery": [
    {
      "node_id": 101,
      "node_name": "牛顿第一定律",
      "mastery_score": 0.75,
      "last_updated": "2024-01-01T12:00:00"
    }
  ],
  "total_questions_answered": 120,
  "correct_rate": 0.68
}
```

### 5.2 更新用户配置
**接口地址:** `PUT /users/settings`
**权限:** 已认证用户

**请求参数:**
```json
{
  "theme": "dark",
  "difficulty_level": "medium",
  "notifications_enabled": true
}
```

---

## 6. 知识节点接口 (Knowledge Nodes)

### 6.1 获取知识图谱
**接口地址:** `GET /knowledge_nodes/tree`
**权限:** 公开

**响应结果:**
```json
{
  "nodes": [
    {
      "id": 1,
      "name": "力学",
      "code": "MECH",
      "level": 1,
      "children": [
        {
          "id": 101,
          "name": "牛顿运动定律",
          "code": "MECH.NEWTON",
          "level": 2,
          "children": []
        }
      ]
    }
  ]
}
```

### 6.2 获取知识点详情
**接口地址:** `GET /knowledge_nodes/{node_id}`
**权限:** 公开

**响应结果:**
```json
{
  "id": 101,
  "name": "牛顿第一定律",
  "code": "MECH.NEWTON.1",
  "description": "任何物体都要保持匀速直线运动或静止的状态，直到外力迫使它改变运动状态为止",
  "level": 3,
  "parent_id": 10
}
```

---

## 7. 管理员接口 (Admin)

### 7.1 题目管理 - 创建题目
**接口地址:** `POST /admin/questions`
**权限:** 管理员

**请求参数:**
```json
{
  "content_latex": "一个质量为2kg的物体在水平面上运动...",
  "difficulty": 3,
  "question_type": "CALCULATION",
  "answer_schema": {
    "type": "number",
    "unit": "m/s^2",
    "value": 4.5
  },
  "solution_steps": "根据牛顿第二定律F=ma...",
  "primary_node_id": 101
}
```

### 7.2 题目管理 - 批量导入
**接口地址:** `POST /admin/questions/import`
**权限:** 管理员
**请求格式:** multipart/form-data，上传JSON格式的题库文件

### 7.3 用户管理 - 获取用户列表
**接口地址:** `GET /admin/users`
**权限:** 管理员

**查询参数:**
- `page`: 页码，默认1
- `page_size`: 每页数量，默认20
- `search`: 搜索关键词（用户名/邮箱）

**响应结果:**
```json
{
  "total": 100,
  "page": 1,
  "page_size": 20,
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "student1",
      "is_active": true,
      "is_admin": false,
      "created_at": "2024-01-01T12:00:00"
    }
  ]
}
```

---

## 8. 文档接口 (Documents)

### 8.1 获取用户文档列表
**接口地址:** `GET /documents`
**权限:** 已认证用户

**响应结果:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "牛顿运动定律笔记",
      "summary": "关于牛顿三大定律的学习笔记",
      "updated_at": "2024-01-01T12:00:00",
      "visibility": "private"
    }
  ]
}
```

### 8.2 创建文档
**接口地址:** `POST /documents`
**权限:** 已认证用户

**请求参数:**
```json
{
  "title": "新文档",
  "content_markdown": "# 标题\n内容...",
  "visibility": "private"
}
```

### 8.3 获取文档详情
**接口地址:** `GET /documents/{document_id}`
**权限:** 文档所有者或协作者

---

## 9. 媒体接口 (Media)

### 9.1 上传图片
**接口地址:** `POST /media/upload`
**权限:** 已认证用户
**请求格式:** multipart/form-data，支持JPG/PNG/GIF格式，最大10MB

**响应结果:**
```json
{
  "id": "uuid",
  "url": "/media/{uuid}"
}
```

### 9.2 获取媒体文件
**接口地址:** `GET /media/{media_id}`
**权限:** 公开