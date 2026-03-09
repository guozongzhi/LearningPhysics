"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
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
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "document-node",
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
        <div
            className={`document-node-wrapper my-4 rounded-lg border ${
                selected ? "border-sky-500" : "border-slate-600"
            } bg-slate-900/50`}
        >
            <a
                href={node.attrs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
            >
                <div className={`w-12 h-12 ${getFileColor(node.attrs.fileType)} rounded-lg flex items-center justify-center`}>
                    {getFileIcon(node.attrs.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                        {node.attrs.filename}
                    </p>
                    <p className="text-xs text-slate-400">
                        点击下载文件
                    </p>
                </div>
                <div className="text-sky-400 text-sm">下载 →</div>
            </a>
        </div>
    );
}
