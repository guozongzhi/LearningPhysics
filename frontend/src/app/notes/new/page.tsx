"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TopicTreeSelector } from "@/components/notes/topic-tree-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type TopicItem = {
  id: number;
  name: string;
  code: string;
  parent_id: number | null;
  level: number;
  question_count: number;
};

export default function NewNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("# 新主题文档\n\n在这里输入本节主题的核心内容、推导过程和典型例题。");
  const [visibility, setVisibility] = useState<"private" | "class" | "public">("private");
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [teacherTemplates, setTeacherTemplates] = useState<Array<{ id: string; title: string; summary: string | null; content_markdown: string; owner_name: string; node_ids: number[]; updated_at: string }>>([]);
  const [loadingTeacherTemplates, setLoadingTeacherTemplates] = useState(true);

  const templates = [
    {
      id: "concept",
      icon: "🧠",
      name: "概念讲解",
      desc: "定义→公式→示例→误区",
      content: `# 概念名称

## 定义
用一句话清晰描述这个物理概念的核心含义。

## 核心公式
$$F = ma$$

列出该概念涉及的核心公式，并说明各符号的文义。

## 典型示例
- **示例 1**：描述一个能帮助理解该概念的典型场景
- **示例 2**：一个反直觉但正确的例子

## 常见误区
- ❌ 常见错误理解 1
- ✅ 正确理解

## 思考题
在这里留一个开放性思考题，帮助同学加深理解。`,
    },
    {
      id: "derivation",
      icon: "📐",
      name: "公式推导",
      desc: "已知→推导→结论",
      content: `# 公式推导：公式名称

## 已知条件
列出推导所需的前置知识和给定条件。

## 推导过程

### 第一步：出发点
从已知条件出发，写出起始表达式。

$$\\text{起始表达式}$$

### 第二步：关键变换
描述推导的核心数学变换步骤。

### 第三步：化简得出结论
$$\\text{最终公式}$$

## 结论
一句话总结推导得到的结论及其物理意义。

## 注意事项
- 该推导成立的前提条件
- 适用范围和局限性`,
    },
    {
      id: "experiment",
      icon: "🔬",
      name: "实验记录",
      desc: "目的→步骤→数据→结论",
      content: `# 实验名称

## 实验目的
描述本次实验要验证或探究的物理规律。

## 实验器材
- 器材 1
- 器材 2
- 器材 3

## 实验步骤
1. 第一步操作
2. 第二步操作
3. 第三步操作
4. 记录数据

## 数据记录

| 次数 | 变量 1 | 变量 2 | 计算结果 |
|------|--------|--------|----------|
| 1    |        |        |          |
| 2    |        |        |          |
| 3    |        |        |          |

## 数据分析
对实验数据进行分析，画图或计算。

## 结论
根据数据分析，总结实验结论，验证是否符合预期。

## 误差分析
分析可能的误差来源及对结果的影响。`,
    },
  ];

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  useEffect(() => {
    api.getTopics()
      .then((data) => {
        setTopics(data);
      })
      .catch(() => {
        setError("知识点列表加载失败，请确认后端主题接口可用。");
      })
      .finally(() => {
        setLoadingTopics(false);
      });
  }, []);

  useEffect(() => {
    api.getDocumentTemplates()
      .then(setTeacherTemplates)
      .catch(() => { })
      .finally(() => setLoadingTeacherTemplates(false));
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("请先输入文档标题。");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const document = await api.createDocument({
        title: title.trim(),
        summary: summary.trim() || undefined,
        content_markdown: content,
        visibility,
        node_ids: selectedNodeIds,
      });
      router.push(`/notes/${document.id}`);
    } catch {
      setError("创建失败。请先登录，并确认后端增强接口已经启动。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100">新建主题文档</h1>
            <p className="mt-2 text-sm text-slate-400">先完成基础信息和知识点绑定，协作者可在详情页继续管理。</p>
          </div>
          <Button asChild variant="outline" className="border-slate-600 bg-slate-900/40 text-slate-200 hover:bg-slate-800">
            <Link href="/notes">返回列表</Link>
          </Button>
        </div>

        {/* Template selector */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-slate-300">选择模板（可选）</h2>
          <div className="grid grid-cols-3 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template.id)}
                className={`group rounded-xl border p-4 text-left transition-all ${selectedTemplate === template.id
                  ? "border-sky-500/60 bg-sky-950/30 shadow-lg shadow-sky-500/5"
                  : "border-slate-700/50 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
                  }`}
              >
                <div className="text-2xl">{template.icon}</div>
                <div className="mt-2 text-sm font-medium text-slate-200">{template.name}</div>
                <div className="mt-1 text-xs text-slate-500">{template.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Teacher templates */}
        {!loadingTeacherTemplates && teacherTemplates.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-slate-300">📚 教师发布的模板</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teacherTemplates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setTitle(tmpl.title + "（基于模板）");
                    setContent(tmpl.content_markdown);
                    setSelectedNodeIds(tmpl.node_ids);
                    setSelectedTemplate("teacher-" + tmpl.id);
                  }}
                  className={`group rounded-xl border p-4 text-left transition-all ${selectedTemplate === "teacher-" + tmpl.id
                    ? "border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/5"
                    : "border-slate-700/50 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
                    }`}
                >
                  <div className="text-sm font-medium text-slate-200">{tmpl.title}</div>
                  {tmpl.summary && (
                    <div className="mt-1 text-xs text-slate-400 line-clamp-2">{tmpl.summary}</div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span>👤 {tmpl.owner_name}</span>
                    <span>·</span>
                    <span>{new Date(tmpl.updated_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border-slate-700/60 bg-slate-950/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">创建表单</CardTitle>
              <CardDescription className="text-slate-400">填写主题内容并选择可见性，保存后进入文档详情继续编辑。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">标题</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：牛顿运动定律小组共创" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">摘要</label>
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                  placeholder="简要说明这个主题文档的目标和适用对象"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">可见性</label>
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as "private" | "class" | "public")}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                >
                  <option value="private">仅自己</option>
                  <option value="class">受限协作</option>
                  <option value="public">公开</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Markdown 正文</label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={20}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-4 py-3 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-500 resize-y"
                />
              </div>
              {error && <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</div>}
              <div className="flex justify-end">
                <Button onClick={handleCreate} disabled={saving} className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90">
                  {saving ? "创建中..." : "保存草稿并预览 ✏️"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-700/60 bg-slate-950/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">知识点绑定</CardTitle>
              <CardDescription className="text-slate-400">使用树形结构选择相关单元、章节或考点。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingTopics ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-4 text-sm text-slate-500">正在加载知识点...</div>
              ) : (
                <TopicTreeSelector topics={topics} selectedIds={selectedNodeIds} onChange={setSelectedNodeIds} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
