"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type DocumentListItem = {
  id: string;
  title: string;
  summary: string | null;
  visibility: "private" | "class" | "public";
  owner_name: string;
  updated_at: string;
  node_ids: number[];
  collaborator_count: number;
};

const visibilityLabel: Record<DocumentListItem["visibility"], string> = {
  private: "仅自己",
  class: "受限协作",
  public: "公开",
};

export default function NotesPage() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.getDocuments()
      .then((data) => {
        setDocuments(data);
      })
      .catch(() => {
        setError("当前无法加载主题文档。请先登录，并确认后端服务已启动。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredDocuments = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return documents;
    }
    return documents.filter((document) => document.title.toLowerCase().includes(keyword));
  }, [documents, query]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <SiteLogo compact />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-100">主题共创空间</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-400">
                  管理知识点主题文档、组织多人协作，并沉淀课堂笔记与推导过程。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-slate-600 bg-slate-900/40 text-slate-200 hover:bg-slate-800">
                <Link href="/">返回练习首页</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90">
                <Link href="/notes/new">新建主题文档</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-slate-700/60 bg-slate-900/40">
              <CardContent className="p-5">
                <div className="text-sm text-slate-400">可访问文档</div>
                <div className="mt-2 text-3xl font-semibold text-slate-100">{documents.length}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-700/60 bg-slate-900/40">
              <CardContent className="p-5">
                <div className="text-sm text-slate-400">检索方式</div>
                <div className="mt-2 text-lg font-medium text-cyan-300">按标题本地筛选</div>
              </CardContent>
            </Card>
            <Card className="border-slate-700/60 bg-slate-900/40">
              <CardContent className="p-5">
                <div className="text-sm text-slate-400">MVP 能力</div>
                <div className="mt-2 text-sm leading-6 text-slate-200">支持知识点绑定、协作者管理、版本历史与恢复。</div>
              </CardContent>
            </Card>
          </div>
        </header>

        <div className="mb-6">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="按标题搜索主题文档"
            className="border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 px-6 py-14 text-center text-slate-400">
            正在加载主题文档...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-6 py-10 text-center text-rose-200">
            {error}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 px-6 py-14 text-center text-slate-400">
            没有匹配的文档，试试调整搜索词或新建一篇主题文档。
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document) => (
              <Link key={document.id} href={`/notes/${document.id}`} className="block">
                <Card className="h-full border-slate-700/60 bg-slate-900/55 transition-transform duration-200 hover:-translate-y-1 hover:border-sky-400/50 hover:bg-slate-900/80">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-xl leading-7 text-slate-100">{document.title}</CardTitle>
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                        {visibilityLabel[document.visibility]}
                      </span>
                    </div>
                    <CardDescription className="min-h-[60px] leading-6 text-slate-400">
                      {document.summary || "该主题文档尚未补充摘要。"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {document.node_ids.length > 0 ? (
                        document.node_ids.map((nodeId) => (
                          <span
                            key={nodeId}
                            className="rounded-full border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-xs text-slate-300"
                          >
                            知识点 #{nodeId}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-500">
                          未关联知识点
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>协作者 {document.collaborator_count} 人</span>
                      <span>{new Date(document.updated_at).toLocaleString("zh-CN")}</span>
                    </div>
                    <div className="text-sm text-slate-300">发起人：{document.owner_name}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
