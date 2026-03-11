"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { HelpCircle } from "lucide-react";

interface QuestionNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        questionNode: {
            setQuestion: (questionId: string) => ReturnType;
        };
    }
}

export const QuestionNode = Node.create<QuestionNodeOptions>({
    name: "questionNode",
    group: "block",
    atom: true,

    addAttributes() {
        return {
            questionId: {
                default: "",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="question-node"]',
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "question-node",
            }),
        ];
    },

    addCommands() {
        return {
            setQuestion:
                (questionId: string) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: { questionId },
                    });
                },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(QuestionNodeComponent);
    },
});

function QuestionNodeComponent({ node, selected }: any) {
    return (
        <NodeViewWrapper>
            <div
                className={`question-node-wrapper my-4 rounded-lg border ${
                    selected ? "border-amber-500" : "border-slate-600"
                } bg-amber-500/10`}
            >
                <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">
                            关联题目 #{node.attrs.questionId}
                        </p>
                        <p className="text-xs text-slate-400">
                            点击查看题目详情
                        </p>
                    </div>
                </div>
            </div>
        </NodeViewWrapper>
    );
}
