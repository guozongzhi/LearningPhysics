"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { TiptapEditor } from "@/components/notes/tiptap-editor";
import { WhiteboardView } from "@/components/notes/whiteboard-view";
import { markdownToHtml } from "@/components/notes/markdown-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { KnowledgeTag } from "@/components/KnowledgeTag";
import { useAuthStore } from "@/store/auth-store";

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

type DocumentDetail = {
  id: string;
  title: string;
  summary: string | null;
  content_markdown: string;
  content_blocks?: any;
  whiteboard_data?: unknown;
  visibility: "private" | "class" | "public";
  owner_id: string;
  owner_username: string;
  updated_at: string;
  node_ids: number[];
  collaborator_count: number;
  current_user_role: "owner" | "editor" | "viewer";
  collaborators: Collaborator[];
  is_template: boolean;
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

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = params.id;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentJson, setContentJson] = useState<any>(undefined);
  const [whiteboardData, setWhiteboardData] = useState<unknown>(undefined);
  const [visibility, setVisibility] = useState<"private" | "class" | "public">("private");
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [collaboratorCandidates, setCollaboratorCandidates] = useState<CollaboratorCandidate[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState("");
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<"editor" | "viewer">("editor");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutatingCollaborator, setMutatingCollaborator] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"preview" | "whiteboard">("preview");
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Array<{ id: string; content_latex: string; question_type: string; difficulty: number }>>([]);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [togglingTemplate, setTogglingTemplate] = useState(false);
  const [isEditingNodes, setIsEditingNodes] = useState(false);
  const [savingNodes, setSavingNodes] = useState(false);
  const { isLoggedIn, token, isAdmin, _hasHydrated } = useAuthStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const applyDocumentData = (data: DocumentDetail) => {
    // Ensure the owner is explicitly included in the collaborators list for UI rendering
    const enhancedCollaborators = [...(data.collaborators || [])];
    if (!enhancedCollaborators.find((c) => c.role === "owner")) {
      enhancedCollaborators.unshift({
        user_id: data.owner_id,
        username: data.owner_username || "发起人",
        role: "owner",
      });
    }
    const enhancedData = { ...data, collaborators: enhancedCollaborators };

    setDocument(enhancedData);
    setTitle(enhancedData.title);
    setSummary(enhancedData.summary || "");
    setContent(enhancedData.content_markdown || "");
    // 如果有 content_blocks (Tiptap JSON)，留给编辑器自己解析；否则用 Markdown 转换
    if (enhancedData.content_markdown) {
      setContentHtml(markdownToHtml(enhancedData.content_markdown));
    } else {
      setContentHtml("");
    }
    setContentJson(enhancedData.content_blocks);
    setWhiteboardData(enhancedData.whiteboard_data);
    setVisibility(enhancedData.visibility);
    setSelectedNodeIds(enhancedData.node_ids || []);
  };

  useEffect(() => {
    if (!documentId || !isMounted || !_hasHydrated) {
      return;
    }

    if (!isLoggedIn || !token) {
      setError("文档不存在或当前用户无权限访问。请先登录。");
      setLoading(false);
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
  }, [documentId, isMounted, isLoggedIn, token, _hasHydrated]);

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

  const canEdit = isAdmin || document?.current_user_role === "owner" || document?.current_user_role === "editor";
  const isOwner = document?.current_user_role === "owner";
  const contentJsonSignature = useMemo(() => JSON.stringify(contentJson ?? null), [contentJson]);
  const documentContentJsonSignature = useMemo(() => JSON.stringify(document?.content_blocks ?? null), [document?.content_blocks]);
  const whiteboardSignature = useMemo(() => JSON.stringify(whiteboardData ?? null), [whiteboardData]);
  const documentWhiteboardSignature = useMemo(() => JSON.stringify(document?.whiteboard_data ?? null), [document?.whiteboard_data]);
  const hasUnsavedChanges = document
    ? title !== document.title ||
    summary !== (document.summary || "") ||
    contentHtml !== markdownToHtml(document.content_markdown || "") ||
    visibility !== document.visibility ||
    contentJsonSignature !== documentContentJsonSignature ||
    whiteboardSignature !== documentWhiteboardSignature
    : false;
  // Warn on page leave if unsaved changes exist
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

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
    if (!documentId || !canEdit || !document) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.updateDocument(documentId, {
        base_updated_at: document.updated_at,
        title: title.trim(),
        summary: summary.trim(),
        content_markdown: content,
        content_blocks: contentJson,
        whiteboard_data: whiteboardData,
        visibility,
        node_ids: selectedNodeIds,
      });
      await refreshDocument();
      setIsEditing(false);
      setPreviewTab("preview");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("409")) {
        setError("保存冲突：该文档已被其他人更新，请先刷新页面后再保存。");
      } else {
        setError("保存失败。请确认当前账号具备编辑权限，并且后端服务正常。");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEditing = () => {
    if (document) {
      applyDocumentData(document);
    }
    setPendingQuestionId(null);
    setIsEditing(false);
    setIsFullscreen(false);
    setPreviewTab("preview");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleSaveNodes = async () => {
    if (!documentId || !canEdit || !document) return;
    setSavingNodes(true);
    setError(null);
    try {
      await api.updateDocument(documentId, {
        base_updated_at: document.updated_at,
        node_ids: selectedNodeIds,
      });
      await refreshDocument();
      setIsEditingNodes(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("409")) {
        setError("更新冲突：该文档已被其他人更新，请先刷新页面后再编辑知识点。");
      } else {
        setError("更新知识点失败。");
      }
    } finally {
      setSavingNodes(false);
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

  if (loading || !_hasHydrated) {
    return <div className="px-6 py-16 text-center text-slate-400">正在加载主题文档...</div>;
  }

  if (!document) {
    return (
      <div className="min-h-screen px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-lg flex flex-col items-center justify-center rounded-3xl border border-slate-700/60 bg-slate-900/50 p-10 text-center shadow-2xl backdrop-blur">
          <div className="mb-6 text-6xl drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">🔒</div>
          <h3 className="mb-3 text-2xl font-semibold text-slate-100">访问受限</h3>
          <p className="mb-8 text-slate-400 leading-relaxed">
            {error || "文档不存在或当前用户无权限访问。请先登录。"}
          </p>
          <div className="flex gap-4">
            <Button asChild variant="outline" className="border-slate-600 bg-slate-900/40 text-slate-200 hover:bg-slate-800 hover:text-white">
              <Link href="/notes">返回列表</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 font-medium px-6 shadow-lg shadow-sky-500/20">
              <Link href="/login">前往登录 →</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-700/60 bg-slate-950/70 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Enhance / Notes</div>
            {isEditing && canEdit ? (
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="text-3xl font-semibold tracking-tight text-slate-100 bg-slate-900/50 border-slate-700/60 h-auto py-1 px-3 -ml-3"
              />
            ) : (
              <h1 className="text-3xl font-semibold tracking-tight text-slate-100">{document.title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-400">发起人 {document.owner_username}</span>
              <span className="text-slate-600">·</span>
              <span className="text-sm text-slate-400">{visibilityLabel[document.visibility]}</span>
              <span className="text-slate-600">·</span>
              <span className="text-sm text-slate-400">最近更新 {new Date(document.updated_at).toLocaleString("zh-CN")}</span>
            </div>
            {!isEditing && (
              <div className="mt-3">
                {isEditingNodes ? (
                  <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-lg backdrop-blur mb-2">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                      <div className="text-sm font-medium text-slate-200">编辑关联知识点</div>
                      <div className="flex gap-2">
                        <button onClick={() => { setIsEditingNodes(false); setSelectedNodeIds(document?.node_ids || []); }} className="text-xs text-slate-400 hover:text-slate-200">取消</button>
                        <button onClick={handleSaveNodes} disabled={savingNodes} className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                          {savingNodes ? "保存中..." : "保存"}
                        </button>
                      </div>
                    </div>
                    {loadingMeta ? (
                      <div className="text-sm text-slate-500 py-2">加载知识大纲中...</div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedNodeIds.map(nodeId => {
                          const nodeTitle = topics.find((t) => t.id === nodeId)?.name || `知识点 #${nodeId}`;
                          return (
                            <span key={nodeId} className="flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 pl-2.5 pr-1.5 py-1 text-xs text-sky-200">
                              {nodeTitle}
                              <button onClick={() => setSelectedNodeIds(prev => prev.filter(id => id !== nodeId))} className="hover:text-rose-400 ml-1 text-sky-400">✕</button>
                            </span>
                          );
                        })}
                        <select
                          value=""
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val && !selectedNodeIds.includes(val)) {
                              setSelectedNodeIds(prev => [...prev, val]);
                            }
                          }}
                          className="rounded-full border border-slate-700 border-dashed bg-slate-800/50 px-2 py-1 text-xs text-slate-400 outline-none transition focus:border-sky-500 hover:text-slate-200 cursor-pointer w-32"
                        >
                          <option value="">+ 添加知识点...</option>
                          {topics.filter((t) => !t.parent_id).map((topic) => (
                            <optgroup key={topic.id} label={topic.name}>
                              {!selectedNodeIds.includes(topic.id) && <option value={topic.id}>{topic.name}</option>}
                              {topics.filter((n) => n.parent_id === topic.id && !selectedNodeIds.includes(n.id)).map((node) => (
                                <option key={node.id} value={node.id}>{node.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {document.node_ids.length > 0 ? (
                      document.node_ids.map((nodeId) => {
                        const nodeTitle = topics.find((t) => t.id === nodeId)?.name || `知识点 #${nodeId}`;
                        return (
                          <KnowledgeTag
                            key={nodeId}
                            nodeId={nodeId}
                            title={nodeTitle}
                            topics={topics}
                            selectedNodeIds={selectedNodeIds}
                            setSelectedNodeIds={setSelectedNodeIds}
                          />
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500 italic">尚未关联知识点</span>
                    )}
                    {canEdit && (
                      <button onClick={() => setIsEditingNodes(true)} className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-700 hover:text-slate-200 transition-colors">
                        ✏️ 编辑
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
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
              <Button
                onClick={async () => {
                  if (!documentId) return;
                  setTogglingTemplate(true);
                  try {
                    await api.toggleDocumentTemplate(documentId);
                    await refreshDocument();
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : "模板状态切换失败，仅教师可设置模板。";
                    setError(message);
                  } finally {
                    setTogglingTemplate(false);
                  }
                }}
                disabled={togglingTemplate}
                variant="outline"
                className={document.is_template
                  ? "border-amber-500/40 bg-amber-950/20 text-amber-200 hover:bg-amber-900/40"
                  : "border-emerald-500/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/40"
                }
              >
                {togglingTemplate ? "切换中..." : document.is_template ? "✅ 已设为模板" : "📚 设为模板"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 max-w-6xl mx-auto">
          {isEditing && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-5 mb-6">
              <div className="grid gap-6 md:grid-cols-2">

                {/* Column 1: Config & Topics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">可见范围</div>
                    <div className="flex-1">
                      {canEdit ? (
                        <select
                          value={visibility}
                          onChange={(event) => setVisibility(event.target.value as "private" | "class" | "public")}
                          className="w-full max-w-[200px] rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                        >
                          <option value="private">仅自己</option>
                          <option value="class">受限协作</option>
                          <option value="public">公开</option>
                        </select>
                      ) : (
                        <div className="text-sm text-slate-300">{visibilityLabel[document.visibility]}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-16 text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0 pt-1">知识点</div>
                    <div className="flex-1">
                      {loadingMeta ? (
                        <div className="text-sm text-slate-500 py-1">加载中...</div>
                      ) : canEdit ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedNodeIds.map(nodeId => {
                            const nodeTitle = topics.find((t) => t.id === nodeId)?.name || `知识点 #${nodeId}`;
                            return (
                              <span key={nodeId} className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
                                {nodeTitle}
                                <button onClick={() => setSelectedNodeIds(prev => prev.filter(id => id !== nodeId))} className="hover:text-rose-400 ml-1 text-slate-400">✕</button>
                              </span>
                            );
                          })}
                          <select
                            value=""
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (val && !selectedNodeIds.includes(val)) {
                                setSelectedNodeIds(prev => [...prev, val]);
                              }
                            }}
                            className="rounded-md border border-slate-700 border-dashed bg-slate-950 px-2 py-1 text-xs text-slate-400 outline-none transition focus:border-sky-500 hover:text-slate-200 cursor-pointer w-32"
                          >
                            <option value="">+ 添加知识点...</option>
                            {topics.filter((t) => !t.parent_id).map((topic) => (
                              <optgroup key={topic.id} label={topic.name}>
                                {!selectedNodeIds.includes(topic.id) && <option value={topic.id}>{topic.name}</option>}
                                {topics.filter((n) => n.parent_id === topic.id && !selectedNodeIds.includes(n.id)).map((node) => (
                                  <option key={node.id} value={node.id}>{node.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {document.node_ids.length > 0 ? (
                            document.node_ids.map((nodeId) => (
                              <span key={nodeId} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                                #{nodeId}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">未绑定知识点</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Collaborators */}
                <div className="space-y-4 md:border-l md:border-slate-700/50 md:pl-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">协作成员</div>
                      {canEdit && document.collaborators.length === 1 && document.collaborators[0].role === 'owner' && (
                        <div className="text-[10px] text-slate-500">目前仅自己可访问，可从下方添加</div>
                      )}
                    </div>
                    {canEdit ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedCollaborator}
                          onChange={(event) => setSelectedCollaborator(event.target.value)}
                          className="flex-1 min-w-[140px] rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none transition focus:border-sky-500"
                        >
                          <option value="">选择学生...</option>
                          {availableCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.username}>{candidate.username}</option>
                          ))}
                        </select>
                        <select
                          value={newCollaboratorRole}
                          onChange={(event) => setNewCollaboratorRole(event.target.value as "editor" | "viewer")}
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-sky-500 w-20"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <Button
                          onClick={handleAddCollaborator}
                          size="sm"
                          disabled={!selectedCollaborator || mutatingCollaborator === "add"}
                          className="bg-sky-500 text-slate-950 hover:bg-sky-400 h-7 px-3 text-xs"
                        >
                          {mutatingCollaborator === "add" ? "..." : "添加"}
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
                      {document.collaborators.length > 0 ? (
                        document.collaborators.map((collaborator) => (
                          <div key={collaborator.user_id} className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/50 pl-2 pr-1 py-1">
                            <span className="text-xs font-medium text-slate-200">{collaborator.username}</span>

                            {canEdit && collaborator.role !== "owner" ? (
                              <select
                                value={collaborator.role}
                                onChange={(event) => handleUpdateCollaborator(collaborator.user_id, event.target.value as "editor" | "viewer")}
                                disabled={mutatingCollaborator === collaborator.user_id}
                                className="appearance-none text-[10px] uppercase tracking-wider text-cyan-400 bg-cyan-950/50 hover:bg-cyan-900/60 px-1.5 py-0.5 rounded outline-none cursor-pointer border-none text-center min-w-[50px]"
                              >
                                <option value="editor">EDITOR</option>
                                <option value="viewer">VIEWER</option>
                              </select>
                            ) : (
                              <span
                                className="text-[10px] uppercase tracking-wider text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded cursor-default"
                                title={collaborator.role === 'owner' ? "发起人的权限不可修改" : ""}
                              >
                                {collaborator.role}
                              </span>
                            )}

                            {canEdit && collaborator.role !== "owner" && (
                              <div className="flex items-center border-l border-slate-600/50 pl-1 ml-1">
                                <button
                                  onClick={() => handleDeleteCollaborator(collaborator.user_id)}
                                  disabled={mutatingCollaborator === collaborator.user_id}
                                  className="text-slate-500 hover:text-rose-400 px-1 hover:bg-slate-700 rounded text-[10px]"
                                  title="移除"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500">仅发起人。</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <Card className="border-slate-700/60 bg-slate-950/60 shadow-xl overflow-hidden mt-6">
              <CardContent className="space-y-5">
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
                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewTab("preview")}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${previewTab === "preview" ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}
                        >
                          📝 正文
                        </button>
                        <button
                          onClick={() => setPreviewTab("whiteboard")}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${previewTab === "whiteboard" ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}
                        >
                          🎨 白板空间
                        </button>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2 sm:justify-end">
                          <Button
                            onClick={() => {
                              if (isEditing) {
                                if (isFullscreen) setIsFullscreen(false);
                                handleSave();
                              } else {
                                setIsEditing(true);
                              }
                            }}
                            disabled={saving}
                            className={isEditing ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}
                          >
                            {saving ? "保存中..." : isEditing ? "保存修改" : "✏️ 编辑文档"}
                          </Button>
                          {isEditing && (
                            <Button
                              onClick={toggleFullscreen}
                              variant="outline"
                              className="border-slate-600 bg-slate-900/40 text-slate-200 hover:bg-slate-800"
                            >
                              {isFullscreen ? "退出全屏" : "🗖 全屏编辑"}
                            </Button>
                          )}
                          {isEditing && (
                            <Button onClick={handleCancelEditing} variant="outline" className="border-slate-600 bg-slate-900/40 text-slate-200 hover:bg-slate-800">
                              取消编辑
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className={isFullscreen
                      ? "fixed inset-0 z-[100] flex flex-col bg-slate-950 p-6 overscroll-none"
                      : "space-y-6"
                    }>
                      {isFullscreen && (
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                          <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-slate-100">{title || "未命名文档"}</h2>
                            <p className="text-xs text-slate-500">{previewTab === "preview" ? "富文本编辑模式" : "白板编辑模式"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => setPreviewTab(previewTab === "preview" ? "whiteboard" : "preview")}
                              variant="outline"
                              className="border-slate-700 bg-slate-900 text-slate-300 h-9"
                            >
                              {previewTab === "preview" ? "🎨 切换到白板" : "📝 切换到正文"}
                            </Button>
                            <Button
                              onClick={handleSave}
                              disabled={saving}
                              className="bg-sky-500 text-slate-950 hover:bg-sky-400 h-9 px-6 font-semibold"
                            >
                              {saving ? "保存中..." : "保存修改"}
                            </Button>
                            <Button
                              onClick={toggleFullscreen}
                              variant="ghost"
                              className="text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                              退出全屏 ✕
                            </Button>
                          </div>
                        </div>
                      )}

                      {previewTab === "preview" && (
                        <div className={`space-y-4 flex-1 flex flex-col ${isFullscreen ? "min-h-0" : ""}`}>
                          <div className="flex justify-end shrink-0">
                            <Button
                              variant="ghost"
                              className="text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 text-xs h-8"
                              onClick={async () => {
                                if (selectedNodeIds.length === 0) {
                                  setError("请先绑定知识点，方可插入关联题目。");
                                  return;
                                }
                                try {
                                  const questions = await api.getQuestionsByNodes(selectedNodeIds);
                                  setAvailableQuestions(questions);
                                  setShowQuestionPicker(true);
                                } catch {
                                  setError("题目列表加载失败。");
                                }
                              }}
                            >
                              + 插入题目到光标处
                            </Button>
                          </div>
                          <div className={`w-full flex-1 ${isFullscreen ? "overflow-y-auto" : ""}`}>
                            <TiptapEditor
                              key={`${document.id}:${document.updated_at}`}
                              initialContent={contentHtml}
                              onChange={(html, json) => {
                                setContentHtml(html);
                                setContentJson(json);
                              }}
                              readOnly={!isEditing || !canEdit}
                              pendingQuestionId={pendingQuestionId}
                              onQuestionInserted={() => {
                                setPendingQuestionId(null);
                                setShowQuestionPicker(false);
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {previewTab === "whiteboard" && (
                        <div className={`flex-1 ${isFullscreen ? "min-h-0" : "mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 min-h-[500px]"}`}>
                          <WhiteboardView
                            key={`${document.id}:${document.updated_at}:whiteboard`}
                            initialData={whiteboardData}
                            onChange={(data) => setWhiteboardData(data)}
                            readOnly={!isEditing || !canEdit}
                            fullHeight={isFullscreen}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!isEditing && previewTab === "preview" && (
                    <div className={`mt-4 rounded-xl border border-slate-800 bg-slate-900/40 ${isEditing ? "p-4 min-h-[500px]" : "p-6 lg:p-10 min-h-[600px]"}`}>
                      {contentHtml ? (
                        <div
                          className="prose prose-invert max-w-none prose-headings:text-slate-200 prose-p:text-slate-300 prose-strong:text-slate-200 prose-em:text-slate-300 prose-code:text-sky-300 prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 prose-blockquote:border-l-sky-500 prose-blockquote:bg-slate-800/50 prose-blockquote:text-slate-300"
                          dangerouslySetInnerHTML={{ __html: contentHtml }}
                        />
                      ) : (
                        <MarkdownPreview content={content} emptyText="内容为空。" />
                      )}
                    </div>
                  )}

                  {previewTab === "whiteboard" && !isEditing && (
                    <div className={`mt-4 rounded-xl border border-slate-800 bg-slate-900/40 ${isEditing ? "p-4 min-h-[500px]" : "p-6 lg:p-10 min-h-[600px]"}`}>
                      <WhiteboardView
                        key={`${document.id}:${document.updated_at}:whiteboard`}
                        initialData={whiteboardData}
                        onChange={(data) => setWhiteboardData(data)}
                        readOnly={!isEditing || !canEdit}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              {error && <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</div>}

              {/* Question picker Modal */}
              {showQuestionPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                      <span className="text-lg font-medium text-slate-100">选择要插入的题目</span>
                      <button onClick={() => setShowQuestionPicker(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                        关闭 ✕
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {availableQuestions.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">当前绑定知识点下暂无题目。</div>
                      ) : (
                        <div className="space-y-3">
                          {availableQuestions.map((q) => (
                            <button
                              key={q.id}
                              onClick={() => {
                                setPendingQuestionId(q.id);
                              }}
                              className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-left text-sm text-slate-200 hover:border-sky-500/40 hover:bg-sky-950/30 hover:shadow-md transition-all group"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300 border border-sky-500/20">
                                  {q.question_type === "calculation" ? "计算" : q.question_type === "choice" ? "选择" : q.question_type === "true_false" ? "判断" : "填空"}
                                </span>
                                <span className="text-amber-400 text-xs">{"★".repeat(q.difficulty)}{"☆".repeat(5 - q.difficulty)}</span>
                                <span className="ml-auto text-xs text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">点击插入 ↵</span>
                              </div>
                              <div className="line-clamp-3 text-slate-300 leading-relaxed font-serif">{q.content_latex}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
