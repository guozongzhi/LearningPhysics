"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { FileText, Plus } from "lucide-react";

interface PdfNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        pdfNode: {
            setPdf: (url: string, filename: string) => ReturnType;
        };
    }
}

export const PdfNode = Node.create<PdfNodeOptions>({
    name: "pdfNode",
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
                default: "document.pdf",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="pdf-node"]',
                getAttrs: (element: any) => ({
                    url: element.getAttribute("data-url") || element.getAttribute("url"),
                    filename: element.getAttribute("data-filename") || element.getAttribute("filename"),
                }),
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "pdf-node",
                "data-url": node.attrs.url,
                "data-filename": node.attrs.filename,
            }),
        ];
    },

    addCommands() {
        return {
            setPdf:
                (url: string, filename: string) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: { url, filename },
                    });
                },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(PdfNodeComponent);
    },
});

function PdfNodeComponent({ node, selected }: any) {
    return (
        <NodeViewWrapper>
            <div
                className={`pdf-node-wrapper my-6 rounded-xl border-2 transition-all duration-200 ${
                    selected ? "border-sky-500 bg-sky-500/5 shadow-[0_0_15px_rgba(14,165,233,0.1)]" : "border-slate-700/50 bg-slate-800/20"
                } hover:border-slate-500/50 hover:bg-slate-800/40`}
            >
                <a
                    href={node.attrs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-5"
                >
                    <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 shadow-sm">
                        <FileText className="w-7 h-7 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-slate-100 truncate mb-0.5">
                            {node.attrs.filename}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-red-400/10 text-red-400/80 font-medium">PDF</span>
                            点击预览或下载文件
                        </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-sky-500/10 text-sky-400 transition-colors">
                        <Plus className="w-5 h-5 rotate-45 transform" /> {/* Use Plus as a generic arrow/icon if needed or skip */}
                        <span className="text-sm font-medium">下载</span>
                    </div>
                </a>
            </div>
        </NodeViewWrapper>
    );
}
