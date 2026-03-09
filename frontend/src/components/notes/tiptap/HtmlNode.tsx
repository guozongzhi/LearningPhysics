"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { useCallback, useState } from "react";

interface HtmlNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        htmlNode: {
            setHtml: (html: string) => ReturnType;
        };
    }
}

export const HtmlNode = Node.create<HtmlNodeOptions>({
    name: "htmlNode",
    group: "block",
    atom: true,

    addAttributes() {
        return {
            html: {
                default: "",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="html-node"]',
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "html-node",
            }),
            ["div", { class: "html-content", dangerouslySetInnerHTML: { __html: node.attrs.html } }],
        ];
    },

    addCommands() {
        return {
            setHtml:
                (html: string) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: { html },
                    });
                },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(HtmlNodeComponent);
    },
});

function HtmlNodeComponent({ node, updateAttributes, selected }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [htmlValue, setHtmlValue] = useState(node.attrs.html);

    const handleSave = useCallback(() => {
        updateAttributes({ html: htmlValue });
        setIsEditing(false);
    }, [htmlValue, updateAttributes]);

    return (
        <div
            className={`html-node-wrapper my-4 rounded-lg border ${
                selected ? "border-sky-500" : "border-slate-600"
            } bg-slate-900/50`}
        >
            {isEditing ? (
                <div className="p-4">
                    <textarea
                        value={htmlValue}
                        onChange={(e) => setHtmlValue(e.target.value)}
                        placeholder="粘贴 HTML 代码..."
                        className="w-full h-40 rounded-md border border-slate-600 bg-slate-950 p-3 text-sm text-slate-200 font-mono"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1 text-sm text-slate-400 hover:text-slate-200"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-3 py-1 text-sm bg-sky-500 text-slate-950 rounded hover:bg-sky-400"
                        >
                            保存
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative group">
                    <div
                        className="html-content p-4"
                        dangerouslySetInnerHTML={{ __html: node.attrs.html || "<p class='text-slate-500 text-sm'>点击编辑 HTML</p>" }}
                    />
                    <button
                        onClick={() => setIsEditing(true)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
                    >
                        编辑
                    </button>
                </div>
            )}
        </div>
    );
}
