# 优化 Tiptap 编辑器工具栏

## 上下文

用户提供了一个现代富文本编辑器的截图，希望参考该设计中的**工具栏部分**来优化当前的 Tiptap 编辑器实现。主要改进点包括：

1. 更现代的工具栏布局和分组
2. 更好的下拉菜单设计（参考截图中的列表选择器）
3. 利用现有的 Radix UI 和 shadcn/ui 组件库
4. 改进的视觉样式和交互体验

## 当前代码库分析

### 现有组件库
- **Radix UI**: 已有完整依赖，包括 `@radix-ui/react-accordion`, `@radix-ui/react-checkbox` 等
- **shadcn/ui**: 已有 Button, Card, Input, Label 等组件
- **Lucide React**: 图标库已在使用
- **Tailwind CSS**: 完整的样式系统

### 当前 Tiptap 编辑器
- 文件: `/frontend/src/components/notes/tiptap-editor.tsx`
- 已有自定义下拉菜单实现
- 已有完整的工具栏功能
- 使用自定义 MenuButton 组件

## 优化方案

### 1. 添加 Radix UI Dropdown Menu 组件
首先需要添加 `@radix-ui/react-dropdown-menu` 依赖，并创建 shadcn/ui 风格的 DropdownMenu 组件。

### 2. 重构工具栏布局
参考截图中的设计，重新组织工具栏分组：
- 第一组: 撤销/重做
- 第二组: 标题选择器（下拉）
- 第三组: 列表选择器（下拉，包含 Bullet List, Ordered List）
- 第四组: 文本格式化（粗体、斜体、下划线、代码等）
- 第五组: 媒体插入（图片、PDF、文档、HTML）

### 3. 实现列表选择下拉菜单
创建一个美观的下拉菜单，包含：
- Bullet List (圆点列表)
- Ordered List (有序列表)
- 视觉上与截图中的设计一致

### 4. 改进视觉样式
- 更好的工具栏分组和分隔
- 更现代的按钮样式
- 下拉菜单的阴影和圆角优化
- 激活状态的视觉反馈

## 需要修改的文件

### 新增文件
1. `/frontend/src/components/ui/dropdown-menu.tsx` - Radix UI DropdownMenu 组件（shadcn/ui 风格）

### 修改文件
1. `/frontend/src/components/notes/tiptap-editor.tsx` - 重构工具栏和下拉菜单
2. `/frontend/package.json` - 添加 Radix UI DropdownMenu 依赖（如果需要）

## 实现步骤

1. **添加 DropdownMenu 组件**
   - 检查是否已有 `@radix-ui/react-dropdown-menu`
   - 创建 shadcn/ui 风格的 DropdownMenu 组件

2. **重构工具栏**
   - 重新组织分组
   - 使用新的 DropdownMenu 替换自定义下拉
   - 保持所有现有功能

3. **实现列表选择器**
   - 创建带图标的列表选项
   - 支持 Bullet List 和 Ordered List
   - 添加键盘快捷键提示

4. **优化样式**
   - 应用更现代的视觉设计
   - 确保与现有 UI 风格一致

## 验证

- 确保所有现有编辑器功能正常工作
- 测试下拉菜单的交互
- 验证在不同屏幕尺寸下的响应式布局
- 检查键盘快捷键是否正常
