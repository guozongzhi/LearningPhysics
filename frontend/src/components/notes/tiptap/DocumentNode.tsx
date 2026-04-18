"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { FileText, FileSpreadsheet, File, Presentation } from "lucide-react";

interface DocumentNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        documentNode: {
            setDocument: (url: string, filename: string, fileType: string) => ReturnType;
        };
    }
}

function getFileIcon(fileType: string) {
    if (fileType.includes("pdf")) return <FileText className="w-6 h-6 text-red-400" />;
    if (fileType.includes("sheet") || fileType.includes("excel"))
        return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
    if (fileType.includes("presentation") || fileType.includes("powerpoint"))
        return <Presentation className="w-6 h-6 text-orange-400" />;
    return <File className="w-6 h-6 text-blue-400" />;
}

function getFileColor(fileType: string) {
    if (fileType.includes("pdf")) return "bg-red-500/20";
    if (fileType.includes("sheet") || fileType.includes("excel")) return "bg-emerald-500/20";
    if (fileType.includes("presentation") || fileType.includes("powerpoint"))
        return "bg-orange-500/20";
    return "bg-blue-500/20";
}

export const DocumentNode = Node.create<DocumentNodeOptions>({
    name: "documentNode",
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
        return {
            url: {
                default: "",
            },
            filename: {
                default: "document",
            },
            fileType: {
                default: "other",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="document-node"]',
                getAttrs: (element: any) => ({
                    url: element.getAttribute("data-url") || element.getAttribute("url"),
                    filename: element.getAttribute("data-filename") || element.getAttribute("filename"),
                    fileType: element.getAttribute("data-file-type") || element.getAttribute("file-type"),
                }),
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "document-node",
                "data-url": node.attrs.url,
                "data-filename": node.attrs.filename,
                "data-file-type": node.attrs.fileType,
            }),
        ];
    },

    addCommands() {
        return {
            setDocument:
                (url: string, filename: string, fileType: string) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: { url, filename, fileType },
                    });
                },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(DocumentNodeComponent);
    },
});

function DocumentNodeComponent({ node, selected }: any) {
    return (
        <NodeViewWrapper>
            <div
                className={`document-node-wrapper group relative my-8 overflow-hidden rounded-2xl border transition-all duration-300 ${
                    selected 
                    ? "border-sky-500/50 bg-sky-500/5 shadow-[0_0_20px_rgba(14,165,233,0.15)] ring-1 ring-sky-500/30" 
                    : "border-slate-800 bg-slate-900/60 backdrop-blur-md"
                } hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-xl hover:-translate-y-0.5`}
            >
                {/* 侧边装饰条 */}
                <div className={`absolute left-0 top-0 h-full w-1.5 transition-colors ${selected ? 'bg-sky-500' : 'bg-slate-700 group-hover:bg-sky-500'}`} />

                <a
                    href={node.attrs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-5 p-5 pl-7"
                >
                    {/* 图标容器 */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 scale-110 bg-sky-500/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className={`relative flex h-14 w-12 items-center justify-center rounded-lg ${getFileColor(node.attrs.fileType).replace('bg-', 'bg-opacity-20 bg-')} border border-white/5 shadow-inner`}>
                          {getFileIcon(node.attrs.fileType)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[15px] font-bold text-slate-100 truncate group-hover:text-white transition-colors">
                              {node.attrs.filename}
                          </h4>
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                             {node.attrs.fileType.split('/').pop() || 'FILE'}
                          </span>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-slate-300">
                            <span className="inline-block w-1 h-1 rounded-full bg-slate-500" />
                            点击预览或安全下载
                        </p>
                    </div>

                    {/* 现代化下载按钮 */}
                    <div className="ml-4 shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-400 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                        <span className="text-xs font-bold uppercase tracking-tighter">Download</span>
                        <div className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 group-hover:bg-white/20">
                           <svg className="w-3 h-3 transform group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                           </svg>
                        </div>
                    </div>
                </a>
            </div>
        </NodeViewWrapper>
    );
}
