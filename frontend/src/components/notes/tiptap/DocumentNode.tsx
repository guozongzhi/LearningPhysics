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
                className={`document-node-wrapper my-6 rounded-xl border-2 transition-all duration-200 ${
                    selected ? "border-sky-500 bg-sky-500/5 shadow-[0_0_15px_rgba(14,165,233,0.1)]" : "border-slate-700/50 bg-slate-800/20"
                } hover:border-slate-500/50 hover:bg-slate-800/40`}
            >
                <a
                    href={node.attrs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-5"
                >
                    <div className={`w-14 h-14 ${getFileColor(node.attrs.fileType)} rounded-xl flex items-center justify-center border border-white/5 shadow-sm`}>
                        {getFileIcon(node.attrs.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-slate-100 truncate mb-0.5">
                            {node.attrs.filename}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-medium uppercase text-[10px]">
                                {node.attrs.fileType.split('/').pop() || 'FILE'}
                            </span>
                            点击下载附件
                        </p>
                    </div>
                    <div className="text-sky-400 font-medium text-sm px-3 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 transition-colors">
                        下载 →
                    </div>
                </a>
            </div>
        </NodeViewWrapper>
    );
}
