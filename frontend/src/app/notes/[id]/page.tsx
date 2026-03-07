"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MarkdownPreview } from "@/components/notes/markdown-preview";
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

type Collaborator = {
  user_id: string;
  username: string;
  role: "owner" | "editor" | "viewer";
};

type VersionItem = {
  id: string;
  version_no: number;
  edited_by: string;
  title: string;
  content_markdown: string;
  created_at: string;
};

type DocumentDetail = {
  id: string;
  title: string;
  summary: string | null;
  content_markdown: string;
  visibility: "private" | "class" | "public";
  owner_name: string;
  updated_at: string;
  node_ids: number[];
  collaborator_count: number;
  current_user_role: "owner" | "editor" | "viewer";
  collaborators: Collaborator[];
  versions: VersionItem[];
};

type CollaboratorCandidate = {
  id: string;
  username: string;
};

const visibilityLabel: Record<DocumentDetail["visibility"], string> = {
  private: "仅自己",
  class: "受限协作",
  public: "公开",
};

const collaboratorRoleLabel: Record<Collaborator["role"], string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = params.id;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"private" | "class" | "public">("private");
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [collaboratorCandidates, setCollaboratorCandidates] = useState<CollaboratorCandidate[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState("");
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<"editor" | "viewer">("editor");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutatingCollaborator, setMutatingCollaborator] = useState<string | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDocumentData = (data: DocumentDetail) => {
    setDocument(data);
    setTitle(data.title);
    setSummary(data.summary || "");
    setContent(data.content_markdown || "");
    setVisibility(data.visibility);
    setSelectedNodeIds(data.node_ids || []);
    setSelectedVersionId((previous) => previous && data.versions.some((version: VersionItem) => version.id === previous) ? previous : data.versions[0]?.id ?? null);
  };

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let active = true;

    const fetchDocument = async () => {
      try {
        const data = await api.getDocument(documentId);
        if (active) {
          applyDocumentData(data);
        }
      } catch {
        if (active) {
          setError("无法加载文档详情，请先登录并确认增强后端接口已启动。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDocument();

    return () => {
      active = false;
    };
  }, [documentId]);

  useEffect(() => {
    Promise.all([
      api.getTopics(),
      api.getCollaboratorCandidates(),
    ])
      .then(([topicsData, candidates]) => {
        setTopics(topicsData);
        setCollaboratorCandidates(candidates);
      })
      .catch(() => {
        setError((previous) => previous || "知识点或协作者候选列表加载失败。");
      })
      .finally(() => {
        setLoadingMeta(false);
      });
  }, []);

  const canEdit = document?.current_user_role === "owner" || document?.current_user_role === "editor";
  const isOwner = document?.current_user_role === "owner";
  const selectedVersion = useMemo(
    () => document?.versions.find((version) => version.id === selectedVersionId) ?? document?.versions[0] ?? null,
    [document, selectedVersionId]
  );

  const refreshDocument = async () => {
    if (!documentId) {
      return;
    }
    try {
      const data = await api.getDocument(documentId);
      applyDocumentData(data);
    } catch {
      setError("文档刷新失败，请稍后重试。");
    }
  };

  const handleSave = async () => {
    if (!documentId || !canEdit) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.updateDocument(documentId, {
        title: title.trim(),
        summary: summary.trim(),
        content_markdown: content,
        visibility,
        node_ids: selectedNodeIds,
      });
      await refreshDocument();
    } catch {
      setError("保存失败。请确认当前账号具备编辑权限，并且后端服务正常。");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!documentId || !selectedCollaborator) {
      return;
    }

    setMutatingCollaborator("add");
    setError(null);

    try {
      await api.addDocumentCollaborator(documentId, {
        username: selectedCollaborator,
        role: newCollaboratorRole,
      });
      setSelectedCollaborator("");
      await refreshDocument();
    } catch {
      setError("添加协作者失败。请确认对方存在，且尚未加入当前文档。");
    } finally {
      setMutatingCollaborator(null);
    }
  };

  const handleUpdateCollaborator = async (userId: string, role: "editor" | "viewer") => {
    if (!documentId) {
      return;
    }

    setMutatingCollaborator(userId);
    setError(null);

    try {
      await api.updateDocumentCollaborator(documentId, userId, { role });
      await refreshDocument();
    } catch {
      setError("更新协作者角色失败。");
    } finally {
      setMutatingCollaborator(null);
    }
  };

  const handleDeleteCollaborator = async (userId: string) => {
    if (!documentId) {
      return;
    }

    setMutatingCollaborator(userId);
    setError(null);

    try {
      await api.deleteDocumentCollaborator(documentId, userId);
      await refreshDocument();
    } catch {
      setError("移除协作者失败。");
    } finally {
      setMutatingCollaborator(null);
    }
  };

  const handleRestoreVersion = async () => {
    if (!documentId || !selectedVersion || !isOwner) {
      return;
    }

    setRestoringVersion(selectedVersion.id);
    setError(null);

    try {
      await api.restoreDocumentVersion(documentId, selectedVersion.id);
      await refreshDocument();
    } catch {
      setError("恢复版本失败。");
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentId || !isOwner) {
      return;
    }

    const confirmed = window.confirm("确认删除这篇主题文档吗？此操作不可恢复。");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await api.deleteDocument(documentId);
      router.push("/notes");
    } catch {
      setError("删除失败。");
    } finally {
      setDeleting(false);
    }
  };

  const availableCandidates = collaboratorCandidates.filter(
    (candidate) => !document?.collaborators.some((collaborator) => collaborator.username === candidate.username)
  );

  if (loading) {
    return <div className="px-6 py-16 text-center text-slate-400">正在加载主题文档...</div>;
  }

  if (!document) {
    return <div className="px-6 py-16 text-center text-rose-200">{error || "文档不存在或当前用户无权限访问。"}</div>;
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-700/60 bg-slate-950/70 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Enhance / Notes</div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100">{document.title}</h1>
            <p className="text-sm text-slate-400">
              发起人 {document.owner_name} · {visibilityLabel[document.visibility]} · 最近更新 {new Date(document.updated_at).toLocaleString("zh-CN")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-slate-600 bg-slate-900/40 text-slate-200 hover:bg-slate-800">
              <Link href="/notes">返回列表</Link>
            </Button>
            {isOwner && (
              <Button onClick={handleDeleteDocument} disabled={deleting} variant="outline" className="border-rose-500/40 bg-rose-950/20 text-rose-200 hover:bg-rose-900/40">
                {deleting ? "删除中..." : "删除文档"}
              </Button>
            )}
            {canEdit && (
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90">
                {saving ? "保存中..." : "保存当前草稿"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="border-slate-700/60 bg-slate-950/60">
              <CardHeader>
                <CardTitle className="text-slate-100">关联信息</CardTitle>
                <CardDescription className="text-slate-400">可见性、知识点绑定和当前协作成员。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-slate-300">
                <div className="space-y-2">
                  <div className="text-slate-400">可见范围</div>
                  {canEdit ? (
                    <select
                      value={visibility}
                      onChange={(event) => setVisibility(event.target.value as "private" | "class" | "public")}
                      className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                    >
                      <option value="private">仅自己</option>
                      <option value="class">受限协作</option>
                      <option value="public">公开</option>
                    </select>
                  ) : (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">{visibilityLabel[document.visibility]}</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="text-slate-400">知识点绑定</div>
                  {loadingMeta ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-4 text-sm text-slate-500">正在加载知识点...</div>
                  ) : canEdit ? (
                    <TopicTreeSelector topics={topics} selectedIds={selectedNodeIds} onChange={setSelectedNodeIds} />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {document.node_ids.length > 0 ? (
                        document.node_ids.map((nodeId) => (
                          <span key={nodeId} className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs">
                            知识点 #{nodeId}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">当前尚未绑定知识点</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/60 bg-slate-950/60">
              <CardHeader>
                <CardTitle className="text-slate-100">协作者管理</CardTitle>
                <CardDescription className="text-slate-400">owner 可添加、改角色或移除协作者；editor/viewer 仅查看。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isOwner && (
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                    <select
                      value={selectedCollaborator}
                      onChange={(event) => setSelectedCollaborator(event.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                    >
                      <option value="">选择要添加的学生</option>
                      {availableCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.username}>
                          {candidate.username}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-3">
                      <select
                        value={newCollaboratorRole}
                        onChange={(event) => setNewCollaboratorRole(event.target.value as "editor" | "viewer")}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <Button
                        onClick={handleAddCollaborator}
                        disabled={!selectedCollaborator || mutatingCollaborator === "add"}
                        className="bg-sky-500 text-slate-950 hover:bg-sky-400"
                      >
                        {mutatingCollaborator === "add" ? "添加中..." : "添加"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {document.collaborators.map((collaborator) => (
                    <div key={collaborator.user_id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-100">{collaborator.username}</div>
                          <div className="text-xs uppercase tracking-wide text-cyan-300">{collaboratorRoleLabel[collaborator.role]}</div>
                        </div>
                        {isOwner && collaborator.role !== "owner" ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={collaborator.role}
                              onChange={(event) => handleUpdateCollaborator(collaborator.user_id, event.target.value as "editor" | "viewer")}
                              disabled={mutatingCollaborator === collaborator.user_id}
                              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <Button
                              onClick={() => handleDeleteCollaborator(collaborator.user_id)}
                              disabled={mutatingCollaborator === collaborator.user_id}
                              variant="outline"
                              className="border-rose-500/40 bg-rose-950/20 text-rose-200 hover:bg-rose-900/40"
                            >
                              移除
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-700/60 bg-slate-950/60">
            <CardHeader>
              <CardTitle className="text-slate-100">文档编辑区</CardTitle>
              <CardDescription className="text-slate-400">左侧编辑 Markdown，右侧实时预览正文和公式渲染结果。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">标题</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">摘要</label>
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={3}
                  disabled={!canEdit}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Markdown 内容</label>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={22}
                    disabled={!canEdit}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-3 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">预览</label>
                  <div className="min-h-[460px] rounded-md border border-slate-800 bg-slate-900/70 p-4">
                    <MarkdownPreview content={content} emptyText="文档内容为空，保存后可继续补充。" />
                  </div>
                </div>
              </div>
              {error && <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</div>}
            </CardContent>
          </Card>

          <Card className="border-slate-700/60 bg-slate-950/60">
            <CardHeader>
              <CardTitle className="text-slate-100">版本侧栏</CardTitle>
              <CardDescription className="text-slate-400">选择历史版本查看快照，owner 可将正文恢复到该版本。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {document.versions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedVersion?.id === version.id
                        ? "border-cyan-400/60 bg-cyan-500/10"
                        : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-100">版本 V{version.version_no}</div>
                    <div className="mt-1 text-xs text-slate-400">编辑者：{version.edited_by}</div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(version.created_at).toLocaleString("zh-CN")}</div>
                  </button>
                ))}
              </div>

              {selectedVersion && (
                <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{selectedVersion.title}</div>
                    <div className="mt-1 text-xs text-slate-500">快照内容预览</div>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <MarkdownPreview content={selectedVersion.content_markdown} emptyText="该版本没有正文内容。" />
                  </div>
                  {isOwner && (
                    <Button
                      onClick={handleRestoreVersion}
                      disabled={restoringVersion === selectedVersion.id}
                      className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    >
                      {restoringVersion === selectedVersion.id ? "恢复中..." : "恢复到此版本"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
