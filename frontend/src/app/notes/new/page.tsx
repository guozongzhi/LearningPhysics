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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border-slate-700/60 bg-slate-950/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-slate-100">创建表单</CardTitle>
              <CardDescription className="text-slate-400">填写主题内容并选择可见性，保存后自动生成版本 V1。</CardDescription>
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
                <label className="text-sm text-slate-300">Markdown 正文</label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={18}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-3 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-500"
                />
              </div>
              {error && <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</div>}
              <div className="flex justify-end">
                <Button onClick={handleCreate} disabled={saving} className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90">
                  {saving ? "创建中..." : "创建主题文档"}
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
