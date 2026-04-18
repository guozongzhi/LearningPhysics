"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { FileText } from "lucide-react";

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
                className={`pdf-node-wrapper my-4 rounded-lg border ${
                    selected ? "border-sky-500" : "border-slate-600"
                } bg-slate-900/50`}
            >
                <a
                    href={node.attrs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
                >
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                            {node.attrs.filename}
                        </p>
                        <p className="text-xs text-slate-400">
                            点击下载 PDF 文件
                        </p>
                    </div>
                    <div className="text-sky-400 text-sm">下载 →</div>
                </a>
            </div>
        </NodeViewWrapper>
    );
}
