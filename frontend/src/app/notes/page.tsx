"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type Collaborator = {
  user_id: string;
  username: string;
  role: "owner" | "editor" | "viewer";
};

type DocumentListItem = {
  id: string;
  title: string;
  summary: string | null;
  visibility: "private" | "class" | "public";
  owner_id: string;
  owner_username: string;
  updated_at: string;
  node_ids: number[];
  collaborator_count: number;
  collaborators: Collaborator[];
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
  const { isLoggedIn, token, _hasHydrated } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !_hasHydrated) return; // Wait for hydration

    const hasToken = !!token;

    if (!hasToken) {
      setDocuments([]);
      setError("需登录后探索。");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
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
  }, [isMounted, isLoggedIn, token]);

  const filteredDocuments = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return documents;
    }
    return documents.filter((document) => document.title.toLowerCase().includes(keyword));
  }, [documents, query]);

  const stats = useMemo(() => {
    const nodes = new Set<number>();
    const userIds = new Set<string>();
    documents.forEach(doc => {
      doc.node_ids.forEach(id => nodes.add(id));
      doc.collaborators?.forEach(c => userIds.add(c.user_id));
    });
    return {
      docs: documents.length,
      nodes: nodes.size,
      users: userIds.size
    };
  }, [documents]);

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
                  深耕物理本源，汇聚群体智慧，共创共享知识资产。
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
                <div className="text-sm text-slate-400 font-medium">可访问主题</div>
                <div className="mt-2 text-3xl font-semibold text-slate-100 flex items-baseline gap-1">
                  {stats.docs}
                  <span className="text-xs font-normal text-slate-500">篇</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-700/60 bg-slate-900/40">
              <CardContent className="p-5">
                <div className="text-sm text-slate-400 font-medium">知识点覆盖</div>
                <div className="mt-2 text-3xl font-semibold text-sky-400 flex items-baseline gap-1">
                  {stats.nodes}
                  <span className="text-xs font-normal text-slate-500">个</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-700/60 bg-slate-900/40">
              <CardContent className="p-5">
                <div className="text-sm text-slate-400 font-medium">协作活跃度</div>
                <div className="mt-2 text-3xl font-semibold text-cyan-300 flex items-baseline gap-1">
                  {stats.users}
                  <span className="text-xs font-normal text-slate-500">人参与</span>
                </div>
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
          <div className="rounded-3xl border border-slate-700/60 bg-slate-900/50 px-6 py-20 text-center shadow-2xl flex flex-col items-center transition-colors">
            <div className="mb-6 text-6xl drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">🔒</div>
            <h3 className="mb-3 text-2xl font-semibold text-slate-100">请先登录</h3>
            <p className="mb-8 max-w-sm text-slate-400 leading-relaxed">
              {error}
            </p>
            <Button asChild size="lg" className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 font-medium shadow-lg shadow-sky-500/20 px-8">
              <Link href="/login">前往登录 →</Link>
            </Button>
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
                    <div className="flex flex-col gap-3 mt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const collabs = [...(document.collaborators || [])];
                          if (!collabs.find(c => c.role === "owner")) {
                            collabs.unshift({
                              user_id: document.owner_id,
                              username: document.owner_username || "发起人",
                              role: "owner"
                            });
                          }
                          const shown = collabs.slice(0, 3);
                          const hidden = collabs.length > 3;
                          return (
                            <>
                              <span className="text-sm text-slate-400 mr-1">成员</span>
                              {shown.map(c => (
                                <span key={c.user_id} className="text-xs font-medium text-slate-200 bg-slate-800/80 border border-slate-700 rounded-md px-2 py-0.5">
                                  {c.username}
                                </span>
                              ))}
                              {hidden && <span className="text-xs text-slate-500 bg-slate-800/40 rounded-md px-2 py-0.5">等...</span>}
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3 mt-1">
                        <span className="text-slate-400">发起人: <span className="text-slate-300">{document.owner_username}</span></span>
                        <span>{new Date(document.updated_at).toLocaleString("zh-CN")}</span>
                      </div>
                    </div>
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
