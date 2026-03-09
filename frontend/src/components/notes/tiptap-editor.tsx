"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlock from "@tiptap/extension-code-block";
import { Bold, Italic, Underline as UnderlineIcon, Code, Quote, List, ListOrdered, Heading1, Heading2, Heading3, Image as ImageIcon, FileText, File, Presentation, Code2, Undo, Redo } from "lucide-react";
import { useState, useCallback, useRef } from "react";

import { HtmlNode } from "./tiptap/HtmlNode";
import { PdfNode } from "./tiptap/PdfNode";
import { DocumentNode } from "./tiptap/DocumentNode";
import { QuestionNode } from "./tiptap/QuestionNode";
import { api } from "@/lib/api";

interface TiptapEditorProps {
    initialContent?: string;
    onChange?: (html: string, json: any) => void;
    readOnly?: boolean;
    pendingQuestionId?: string | null;
    onQuestionInserted?: () => void;
}

const MenuButton = ({
    active,
    onClick,
    icon: Icon,
    label,
}: {
    active?: boolean;
    onClick: () => void;
    icon: any;
    label?: string;
}) => (
    <button
        onClick={onClick}
        className={`p-2 rounded transition-colors ${
            active
                ? "bg-sky-500 text-slate-950"
                : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
        }`}
        title={label}
    >
        <Icon className="w-4 h-4" />
    </button>
);

export function TiptapEditor({
    initialContent,
    onChange,
    readOnly = false,
    pendingQuestionId,
    onQuestionInserted,
}: TiptapEditorProps) {
    const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);
    const [htmlInput, setHtmlInput] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isApplyingRef = useRef(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
            }),
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
            CodeBlock,
            HtmlNode,
            PdfNode,
            DocumentNode,
            QuestionNode,
        ],
        content: initialContent || "",
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            if (isApplyingRef.current) return;
            onChange?.(editor.getHTML(), editor.getJSON());
        },
    });

    // 处理题目插入
    const insertQuestion = useCallback((questionId: string) => {
        if (!editor) return;
        editor.commands.setQuestion(questionId);
        onQuestionInserted?.();
    }, [editor, onQuestionInserted]);

    // 当 pendingQuestionId 变化时插入题目
    React.useEffect(() => {
        if (pendingQuestionId && editor) {
            insertQuestion(pendingQuestionId);
        }
    }, [pendingQuestionId, editor, insertQuestion]);

    // 处理文件上传
    const handleFileUpload = useCallback(
        async (file: File) => {
            if (!editor) return;

            try {
                const res = await api.uploadMedia(file);
                const url = res.url;
                const filename = file.name;

                if (file.type.startsWith("image/")) {
                    editor.commands.setImage({ src: url });
                } else if (file.type === "application/pdf") {
                    editor.commands.setPdf(url, filename);
                } else {
                    editor.commands.setDocument(url, filename, file.type);
                }
            } catch (err) {
                console.error("File upload failed:", err);
            }
        },
        [editor]
    );

    const triggerFileUpload = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleInsertHtml = () => {
        if (!editor || !htmlInput.trim()) return;
        editor.commands.setHtml(htmlInput);
        setIsHtmlModalOpen(false);
        setHtmlInput("");
    };

    if (!editor) {
        return (
            <div className="w-full min-h-[500px] rounded-md border border-slate-700 bg-slate-950 p-4 flex items-center justify-center text-slate-500">
                加载编辑器...
            </div>
        );
    }

    return (
        <div className="w-full min-h-[500px] rounded-md border border-slate-700 bg-slate-950 overflow-visible">
            {/* 工具栏 */}
            {!readOnly && (
                <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-700 bg-slate-900">
                    <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
                        <MenuButton
                            active={editor.isActive("bold")}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            icon={Bold}
                            label="粗体"
                        />
                        <MenuButton
                            active={editor.isActive("italic")}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            icon={Italic}
                            label="斜体"
                        />
                        <MenuButton
                            active={editor.isActive("underline")}
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            icon={UnderlineIcon}
                            label="下划线"
                        />
                        <MenuButton
                            active={editor.isActive("code")}
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            icon={Code}
                            label="行内代码"
                        />
                    </div>

                    <div className="flex items-center gap-1 px-2 border-r border-slate-700">
                        <MenuButton
                            active={editor.isActive("heading", { level: 1 })}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            icon={Heading1}
                            label="标题1"
                        />
                        <MenuButton
                            active={editor.isActive("heading", { level: 2 })}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            icon={Heading2}
                            label="标题2"
                        />
                        <MenuButton
                            active={editor.isActive("heading", { level: 3 })}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            icon={Heading3}
                            label="标题3"
                        />
                    </div>

                    <div className="flex items-center gap-1 px-2 border-r border-slate-700">
                        <MenuButton
                            active={editor.isActive("bulletList")}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            icon={List}
                            label="无序列表"
                        />
                        <MenuButton
                            active={editor.isActive("orderedList")}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            icon={ListOrdered}
                            label="有序列表"
                        />
                        <MenuButton
                            active={editor.isActive("blockquote")}
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            icon={Quote}
                            label="引用"
                        />
                        <MenuButton
                            active={editor.isActive("codeBlock")}
                            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                            icon={Code2}
                            label="代码块"
                        />
                    </div>

                    <div className="flex items-center gap-1 px-2 border-r border-slate-700">
                        <MenuButton
                            onClick={() => triggerFileUpload("image/*")}
                            icon={ImageIcon}
                            label="插入图片"
                        />
                        <MenuButton
                            onClick={() => triggerFileUpload("application/pdf")}
                            icon={FileText}
                            label="插入 PDF"
                        />
                        <MenuButton
                            onClick={() => triggerFileUpload(".ppt,.pptx,.doc,.docx,.xls,.xlsx")}
                            icon={File}
                            label="插入文档"
                        />
                        <MenuButton
                            onClick={() => setIsHtmlModalOpen(true)}
                            icon={Presentation}
                            label="插入 HTML"
                        />
                    </div>

                    <div className="flex items-center gap-1 px-2">
                        <MenuButton
                            onClick={() => editor.chain().focus().undo().run()}
                            icon={Undo}
                            label="撤销"
                        />
                        <MenuButton
                            onClick={() => editor.chain().focus().redo().run()}
                            icon={Redo}
                            label="重做"
                        />
                    </div>
                </div>
            )}

            {/* 编辑器内容 */}
            <div className="p-4">
                <style>{`
                    .tiptap-editor-content h1 {
                        font-size: 1.875rem !important;
                        font-weight: 700 !important;
                        color: #e2e8f0 !important;
                        margin-top: 1.5rem !important;
                        margin-bottom: 1rem !important;
                    }
                    .tiptap-editor-content h2 {
                        font-size: 1.5rem !important;
                        font-weight: 600 !important;
                        color: #e2e8f0 !important;
                        margin-top: 1.25rem !important;
                        margin-bottom: 0.75rem !important;
                    }
                    .tiptap-editor-content h3 {
                        font-size: 1.25rem !important;
                        font-weight: 600 !important;
                        color: #e2e8f0 !important;
                        margin-top: 1rem !important;
                        margin-bottom: 0.5rem !important;
                    }
                    .tiptap-editor-content p {
                        color: #cbd5e1 !important;
                        margin-bottom: 0.5rem !important;
                    }
                    .tiptap-editor-content strong {
                        color: #e2e8f0 !important;
                    }
                    .tiptap-editor-content em {
                        color: #cbd5e1 !important;
                    }
                    .tiptap-editor-content code {
                        color: #38bdf8 !important;
                    }
                    .tiptap-editor-content pre {
                        background-color: #1e293b !important;
                        border: 1px solid #334155 !important;
                    }
                    .tiptap-editor-content blockquote {
                        border-left: 4px solid #0ea5e9 !important;
                        background-color: rgba(30, 41, 59, 0.5) !important;
                        color: #cbd5e1 !important;
                    }
                `}</style>
                <EditorContent
                    editor={editor}
                    className="tiptap-editor-content prose prose-invert max-w-none"
                />
            </div>

            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* HTML 输入弹窗 */}
            {isHtmlModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                            <span className="text-lg font-medium text-slate-100">插入 HTML 代码</span>
                            <button
                                onClick={() => {
                                    setIsHtmlModalOpen(false);
                                    setHtmlInput("");
                                }}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                关闭 ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <textarea
                                value={htmlInput}
                                onChange={(e) => setHtmlInput(e.target.value)}
                                placeholder="粘贴 HTML 代码..."
                                className="w-full h-64 rounded-md border border-slate-600 bg-slate-950 p-3 text-sm text-slate-200 font-mono"
                            />
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-4">
                            <button
                                onClick={() => {
                                    setIsHtmlModalOpen(false);
                                    setHtmlInput("");
                                }}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleInsertHtml}
                                className="px-4 py-2 text-sm bg-sky-500 text-slate-950 rounded hover:bg-sky-400"
                            >
                                插入
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
