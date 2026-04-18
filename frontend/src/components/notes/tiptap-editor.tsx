"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  ListTodo,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  FileText,
  File,
  Plus,
  Code2,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Highlighter,
  ChevronDown,
  Palette,
  Link as LinkIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Strike from "@tiptap/extension-strike";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import ResizeImage from "tiptap-extension-resize-image";

import { HtmlNode } from "./tiptap/HtmlNode";
import { PdfNode } from "./tiptap/PdfNode";
import { DocumentNode } from "./tiptap/DocumentNode";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  initialContent?: string;
  initialContentJson?: any;
  onChange?: (html: string, json: Record<string, any>) => void;
  readOnly?: boolean;
}

const ToolbarButton = ({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label?: string;
}) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    className={cn(
      "h-9 w-9 opacity-60 transition-all hover:opacity-100 hover:bg-slate-500/10",
      active && "bg-sky-500/20 opacity-100 text-sky-500"
    )}
    style={{ color: "rgb(203 213 225)" }} // Slate-300 consistently for toolbar
    title={label}
  >
    <Icon className="h-4 w-4" />
  </Button>
);

export function TiptapEditor({
  initialContent,
  initialContentJson,
  onChange,
  readOnly = false,
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
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg shadow-sm border border-slate-700/30",
        },
      }),
      ResizeImage.configure({
        inline: false,
      }),
      CodeBlock,
      HtmlNode,
      PdfNode,
      DocumentNode,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight,
      Strike,
      TextStyle,
      Color,
    ],
    content: initialContentJson || initialContent || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (isApplyingRef.current) return;
      onChange?.(editor.getHTML(), editor.getJSON());
    },
    editorProps: {
      handlePaste(view, event) {
        if (!editor || !event.clipboardData) return false;
        const files = Array.from(event.clipboardData.files);
        if (files.length > 0) {
          event.preventDefault();
          files.forEach(async (file) => {
            try {
              const res = await api.uploadMedia(file);
              const url = res.url;
              if (file.type.startsWith("image/")) {
                editor.commands.setImage({ src: url });
              } else if (file.type === "application/pdf") {
                editor.commands.setPdf(url, file.name);
              } else {
                editor.commands.setDocument(url, file.name, file.type);
              }
            } catch (err) {
              console.error("Paste upload failed:", err);
            }
          });
          return true;
        }
        return false;
      },
      handleDrop(view, event, slice, moved) {
        if (!editor || moved || !event.dataTransfer) return false;
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
          event.preventDefault();
          files.forEach(async (file) => {
            try {
              const res = await api.uploadMedia(file);
              const url = res.url;
              if (file.type.startsWith("image/")) {
                editor.commands.setImage({ src: url });
              } else if (file.type === "application/pdf") {
                editor.commands.setPdf(url, file.name);
              } else {
                editor.commands.setDocument(url, file.name, file.type);
              }
            } catch (err) {
              console.error("Drop upload failed:", err);
            }
          });
          return true;
        }
        return false;
      }
    }
  });

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
        } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          editor.commands.setPdf(url, filename);
        } else {
          editor.commands.setDocument(url, filename, file.type || "application/octet-stream");
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
    editor.commands.setHtmlNode(htmlInput);
    setIsHtmlModalOpen(false);
    setHtmlInput("");
  };

  // Sync content when props change (especially for preview mode)
  useEffect(() => {
    if (editor) {
      const content = initialContentJson || initialContent || "";
      const currentContent = readOnly ? editor.getJSON() : editor.getHTML();
      
      // For readOnly (preview), we are more aggressive with syncing
      if (readOnly) {
         editor.commands.setContent(content);
      } else if (!editor.isFocused && editor.getHTML() !== content) {
         editor.commands.setContent(content);
      }
    }
  }, [editor, initialContent, initialContentJson, readOnly]);

  if (!editor) {
    return (
      <div className="w-full min-h-[500px] rounded-md border border-slate-700 bg-slate-950 p-4 flex items-center justify-center text-slate-500">
        加载编辑器...
      </div>
    );
  }

  return (
    <div className="w-full min-h-[500px] rounded-xl border border-slate-700/30 editor-container overflow-visible relative bg-slate-950 text-slate-200 ring-1 ring-white/5">
      {/* 工具栏 */}
      {!readOnly && (
        <div className="editor-toolbar sticky top-0 z-20 flex flex-wrap items-center gap-0.5 p-1 border-b border-slate-700/30 bg-slate-950/80 backdrop-blur-md transition-colors text-slate-300">
          {/* 撤销/重做 */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-700">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              icon={Undo}
              label="撤销"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              icon={Redo}
              label="重做"
            />
          </div>

          {/* 段落/标题 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1 px-2 text-sm text-slate-300 opacity-70 hover:opacity-100 hover:bg-slate-500/10"
                >
                  <span className="font-bold">H</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                  <span>正文</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                  <Heading1 className="h-4 w-4 mr-2" />
                  <span>标题 1</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  <Heading2 className="h-4 w-4 mr-2" />
                  <span>标题 2</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                  <Heading3 className="h-4 w-4 mr-2" />
                  <span>标题 3</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1 px-2 text-sm opacity-60 hover:opacity-100 hover:bg-slate-500/10"
                  style={{ color: "hsl(var(--editor-text))" }}
                >
                  <List className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                  <List className="h-4 w-4 mr-2" />
                  <span>无序列表</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                  <ListOrdered className="h-4 w-4 mr-2" />
                  <span>有序列表</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ToolbarButton
              active={editor.isActive("taskList")}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              icon={ListTodo}
              label="任务列表"
            />
            <ToolbarButton
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              icon={Quote}
              label="引用"
            />
          </div>

          {/* 基础格式 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-700">
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              icon={Bold}
              label="加粗"
            />
            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              icon={Italic}
              label="斜体"
            />
            <ToolbarButton
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              icon={Strikethrough}
              label="删除线"
            />
            <ToolbarButton
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
              icon={Code}
              label="行内代码"
            />
            <ToolbarButton
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              icon={UnderlineIcon}
              label="下划线"
            />
            <ToolbarButton
              active={editor.isActive("highlight")}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              icon={Highlighter}
              label="高亮"
            />
            {/* 字体颜色 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 opacity-60 hover:opacity-100 hover:bg-slate-500/10 text-slate-300"
                  title="字体颜色"
                >
                  <Palette className="h-4 w-4" style={{ color: editor.getAttributes("textStyle").color || "currentColor" }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32 grid grid-cols-4 gap-1 p-2">
                {[
                  "#ffffff", "#f87171", "#fb923c", "#fbbf24",
                  "#a3e635", "#4ade80", "#2dd4bf", "#38bdf8",
                  "#818cf8", "#c084fc", "#f472b6", "#94a3b8",
                ].map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-sm border border-slate-700"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                  />
                ))}
                <DropdownMenuSeparator className="col-span-4" />
                <button
                  className="col-span-4 text-xs text-center py-1 hover:bg-slate-800 rounded"
                  onClick={() => editor.chain().focus().unsetColor().run()}
                >
                  清除颜色
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
            <ToolbarButton
              active={editor.isActive("link")}
              onClick={() => {
                const url = window.prompt("输入链接地址:");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                } else if (url === "") {
                  editor.chain().focus().unsetLink().run();
                }
              }}
              icon={LinkIcon}
              label="插入链接"
            />
          </div>

          {/* 上下标 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-700">
            <ToolbarButton
              active={editor.isActive("superscript")}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              icon={SuperscriptIcon}
              label="上标"
            />
            <ToolbarButton
              active={editor.isActive("subscript")}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              icon={SubscriptIcon}
              label="下标"
            />
          </div>

          {/* 对齐方式 */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-700">
            <ToolbarButton
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              icon={AlignLeft}
              label="左对齐"
            />
            <ToolbarButton
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              icon={AlignCenter}
              label="居中"
            />
            <ToolbarButton
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              icon={AlignRight}
              label="右对齐"
            />
            <ToolbarButton
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              icon={AlignJustify}
              label="两端对齐"
            />
          </div>

          {/* 增加菜单 */}
          <div className="flex items-center gap-0.5 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1 px-2 text-sm text-sky-400 hover:bg-sky-500/10"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => triggerFileUpload("image/*")}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  <span>插入图片</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => triggerFileUpload("application/pdf")}>
                  <FileText className="h-4 w-4 mr-2" />
                  <span>插入 PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => triggerFileUpload(".ppt,.pptx,.doc,.docx,.xls,.xlsx")}>
                  <File className="h-4 w-4 mr-2" />
                  <span>插入文档</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsHtmlModalOpen(true)}>
                  <Code2 className="h-4 w-4 mr-2" />
                  <span>插入 HTML</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 主题切换 */}
          <div className="ml-auto pr-2">
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* 编辑器样式 */}
      <style>{`
                    /* Toolbar defensive styles to prevent global leakage */
                    .editor-toolbar button {
                        width: auto !important;
                        height: 2.25rem !important; /* h-9 */
                        padding: 0 0.5rem !important;
                        margin: 0 !important;
                        border-radius: 0.375rem !important;
                        border: none !important;
                        background: transparent !important;
                        color: inherit !important;
                        font-size: 0.875rem !important;
                        line-height: 1 !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        box-shadow: none !important;
                        transition: background-color 0.2s !important;
                    }
                    .editor-toolbar button:hover {
                        background-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .editor-toolbar button.bg-slate-700 {
                        background-color: #334155 !important;
                        color: #f1f5f9 !important;
                    }

                    /* ─── Paper Design & Focus Refinement ─── */
                    .tiptap:focus {
                        outline: none !important;
                    }
                    .tiptap-editor-content {
                        position: relative;
                        z-index: 1;
                    }
                    .tiptap-editor-content .tiptap {
                        min-height: 480px;
                        transition: all 0.3s ease;
                    }
                    /* Subtle paper depth in light mode */
                    .theme-light-paper {
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
                        border: none !important;
                    }
                    /* Focus refinement: Subtle side glow instead of blue box */
                    .tiptap-editor-content .tiptap.ProseMirror-focused {
                        box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.15);
                    }

                    .tiptap-editor-content h1 {
                        font-size: 1.875rem !important;
                        font-weight: 700 !important;
                        color: hsl(var(--editor-heading)) !important;
                        margin-top: 1.5rem !important;
                        margin-bottom: 1rem !important;
                    }
                    .tiptap-editor-content h2 {
                        font-size: 1.5rem !important;
                        font-weight: 600 !important;
                        color: hsl(var(--editor-heading)) !important;
                        margin-top: 1.25rem !important;
                        margin-bottom: 0.75rem !important;
                    }
                    .tiptap-editor-content h3 {
                        font-size: 1.25rem !important;
                        font-weight: 600 !important;
                        color: hsl(var(--editor-heading)) !important;
                        margin-top: 1rem !important;
                        margin-bottom: 0.5rem !important;
                    }
                    .tiptap-editor-content p {
                        color: inherit !important;
                        margin-bottom: 0.5rem !important;
                    }
                    .tiptap-editor-content strong {
                        color: inherit !important;
                        font-weight: 700 !important;
                    }
                    .tiptap-editor-content em {
                        color: inherit !important;
                    }
                    .tiptap-editor-content code {
                        color: #38bdf8 !important;
                    }
                    .tiptap-editor-content pre {
                        background-color: rgba(30, 41, 59, 0.8) !important;
                        border: 1px solid hsl(var(--editor-border)) !important;
                    }
                    .tiptap-editor-content blockquote {
                        border-left: 4px solid #0ea5e9 !important;
                        background-color: rgba(var(--editor-bg), 0.1) !important;
                        color: inherit !important;
                        padding-left: 1rem !important;
                        font-style: italic !important;
                    }
                    .tiptap-editor-content ul,
                    .tiptap-editor-content ul ul,
                    .tiptap-editor-content ul ul ul {
                        padding-left: 1.5rem !important;
                        margin-bottom: 0.75rem !important;
                        margin-top: 0.25rem !important;
                        color: inherit !important;
                    }
                    .tiptap-editor-content ul {
                        list-style-type: disc !important;
                    }
                    /* Task List Styling */
                    .tiptap-editor-content ul[data-type="taskList"] {
                        list-style: none !important;
                        padding-left: 0.5rem !important;
                    }
                    .tiptap-editor-content ul[data-type="taskList"] li {
                        display: flex !important;
                        align-items: flex-start !important;
                        gap: 0.5rem !important;
                    }
                    .tiptap-editor-content ul[data-type="taskList"] input[type="checkbox"] {
                        margin-top: 0.4rem !important;
                        cursor: pointer !important;
                    }
                    .tiptap-editor-content li[data-checked="true"] > div > p {
                        text-decoration: line-through !important;
                        opacity: 0.5 !important;
                        color: inherit !important;
                    }
                    /* Image Resizing Handles */
                    .tiptap-editor-content .resizing-image {
                        display: inline-block;
                        line-height: 0;
                        position: relative;
                        user-select: none;
                    }
                    .tiptap-editor-content .resizing-image .resize-trigger {
                        display: block;
                        position: absolute;
                        right: 0;
                        bottom: 0;
                        width: 12px;
                        height: 12px;
                        background: #0ea5e9;
                        cursor: nwse-resize;
                        z-index: 10;
                        border-radius: 2px;
                    }
                    .tiptap-editor-content .resizing-image img {
                        display: block;
                        max-width: 100%;
                        height: auto;
                    }
                    .tiptap-editor-content .resizing-image.is-focused .resize-trigger {
                        opacity: 1;
                    }
                    .tiptap-editor-content .resizing-image:not(.is-focused) .resize-trigger {
                        opacity: 0;
                    }
                    .tiptap-editor-content ul ul,
                    .tiptap-editor-content li > ul {
                        list-style-type: circle !important;
                    }
                    .tiptap-editor-content ul ul ul,
                    .tiptap-editor-content li > ul > li > ul {
                        list-style-type: square !important;
                    }
                    .tiptap-editor-content ol,
                    .tiptap-editor-content ol ol,
                    .tiptap-editor-content ol ol ol {
                        list-style-type: decimal !important;
                        padding-left: 1.5rem !important;
                        margin-bottom: 0.75rem !important;
                        margin-top: 0.25rem !important;
                        color: inherit !important;
                    }
                    .tiptap-editor-content ol {
                        list-style-type: decimal !important;
                    }
                    .tiptap-editor-content ol ol,
                    .tiptap-editor-content li > ol {
                        list-style-type: lower-alpha !important;
                    }
                    .tiptap-editor-content ol ol ol,
                    .tiptap-editor-content li > ol > li > ol {
                        list-style-type: lower-roman !important;
                    }
                    .tiptap-editor-content li {
                        margin-bottom: 0.25rem !important;
                        color: inherit !important;
                    }
                    .tiptap-editor-content li > p {
                        margin: 0 !important;
                        display: inline !important;
                    }
                    .tiptap-editor-content li p:first-child {
                        display: inline !important;
                    }
                    .tiptap-editor-content li p + p {
                        display: block !important;
                        margin-top: 0.25rem !important;
                        margin-left: 0 !important;
                    }
                    .tiptap-editor-content :where(ul, ol) {
                        list-style-position: outside !important;
                    }
                    .tiptap-editor-content :where(ul, ol) :where(ul, ol) {
                        margin-top: 0.25rem !important;
                        margin-bottom: 0.25rem !important;
                    }
                `}</style>
        {/* 编辑器内容 */}
      <div 
        className={cn(
            !readOnly && "py-6 px-8 lg:py-10 lg:px-14", 
            readOnly && "p-2", 
            "transition-all duration-500 ease-in-out mx-auto max-w-6xl mt-0.5 mb-8 rounded-sm",
            "bg-[hsl(var(--editor-bg))]",
            /* 如果是明亮模式且非只读，应用纸张阴影 */
            !readOnly && "theme-light-paper"
        )}
        style={{
          color: "hsl(var(--editor-text))"
        }}
      >
        <EditorContent
          editor={editor}
          className="tiptap-editor-content max-w-none"
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
              <span className="text-lg font-medium text-slate-100">
                插入 HTML 代码
              </span>
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
