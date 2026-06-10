"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { WhiteboardView } from "../whiteboard-view";

interface WhiteboardNodeOptions {
    HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        whiteboardNode: {
            setWhiteboardNode: (data: unknown) => ReturnType;
        };
    }
}

export const WhiteboardNode = Node.create<WhiteboardNodeOptions>({
    name: "whiteboardNode",
    group: "block",
    atom: true,

    addAttributes() {
        return {
            data: {
                default: null,
                parseHTML: (element) => {
                    try {
                        const raw = element.getAttribute("data-strokes");
                        return raw ? JSON.parse(raw) : null;
                    } catch (e) {
                        return null;
                    }
                },
                renderHTML: (attributes) => {
                    return {
                        "data-strokes": attributes.data ? JSON.stringify(attributes.data) : "",
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="whiteboard-node"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "whiteboard-node",
            }),
        ];
    },

    addCommands() {
        return {
            setWhiteboardNode:
                (data: unknown) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: { data },
                    });
                },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(WhiteboardNodeComponent);
    },
});

function WhiteboardNodeComponent({ node, updateAttributes, editor }: NodeViewProps) {
    const isEditable = editor.isEditable;

    return (
        <NodeViewWrapper className="whiteboard-node-wrapper my-6">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🎨</span>
                        <span className="text-sm font-medium text-slate-200">嵌入式白板空间</span>
                    </div>
                    <span className="text-xs text-slate-500">
                        {isEditable ? "可直接在下方区域涂鸦与绘制" : "只读查看模式"}
                    </span>
                </div>
                <div className="min-h-[500px] rounded-xl border border-slate-800 bg-slate-950/20 overflow-hidden">
                    <WhiteboardView
                        initialData={node.attrs.data}
                        onChange={(newData) => updateAttributes({ data: newData })}
                        readOnly={!isEditable}
                    />
                </div>
            </div>
        </NodeViewWrapper>
    );
}
