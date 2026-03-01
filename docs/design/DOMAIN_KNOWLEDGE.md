# 领域知识与种子数据 (DOMAIN_KNOWLEDGE.md)

## 1. 物理学科上下文
- **单位至关重要:** 在物理学中，没有单位的数字通常是错误的。系统必须验证单位 (例如: `N`, `m/s^2`, `J`)。
- **LaTeX 格式规范:**
    - 行内公式: `$ ... $` (例如: $F = ma$)
    - 块级公式: `$$...$$`
    - 矢量符号: `\vec{v}`
    - 分数: `\frac{a}{b}`
    - 单位: 推荐使用 `\mathrm{kg}` (正体) 而非斜体 `kg`。
- **认知诊断逻辑:**
    - 错误通常不是随机的，而是源于：
        1. **概念错误:** 用错了公式 (例如: 动能公式用成了 $E_k = mv$ 而不是 $1/2 mv^2$)。
        2. **计算错误:** 数学运算失误。
        3. **单位错误:** 忘记将 cm 转换为 m。

## 2. 种子数据示例 (用于填充数据库)

### 示例 1: 力学 (牛顿第二定律)
```json
{
  "content_latex": "如图所示，质量为 $m=2\,\mathrm{kg}$ 的物体静止在光滑水平面上。现对物体施加一个水平方向的恒力 $F=10\,\mathrm{N}$。求物体加速度 $a$ 的大小。",
  "difficulty": 2,
  "question_type": "CALCULATION",
  "primary_node_code": "NEWTON-LAW-2",
  "answer_schema": {
    "type": "value_unit",
    "correct_value": 5.0,
    "unit": "m/s^2",
    "tolerance": 0.1
  },
  "solution_steps": "根据牛顿第二定律: $$F = ma$$ $$a = \frac{F}{m} = \frac{10}{2} = 5\,\mathrm{m/s^2}$$"
}
```

### 示例 2: 电磁学 (洛伦兹力)
```json
{
  "content_latex": "一个质子以速度 $v = 3 \times 10^6\,\mathrm{m/s}$ 垂直射入磁感应强度为 $B = 0.5\,\mathrm{T}$ 的匀强磁场中。计算质子受到的洛伦兹力大小。(质子电荷量 $q \approx 1.6 \times 10^{-19}\,\mathrm{C}$)",
  "difficulty": 3,
  "question_type": "CALCULATION",
  "primary_node_code": "LORENTZ-FORCE",
  "answer_schema": {
    "type": "value_unit",
    "correct_value": 2.4e-13,
    "unit": "N",
    "tolerance": 1e-14
  },
  "solution_steps": "洛伦兹力公式: $$F = qvB$$ 代入数值计算..."
}
```