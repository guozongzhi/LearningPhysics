"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import { useEffect, useMemo, useRef } from "react";
import { zh } from "@blocknote/core/locales";
import { api } from "@/lib/api";
import { PartialBlock } from "@blocknote/core";

interface RichTextEditorProps {
    initialBlocks?: PartialBlock[];
    initialMarkdown?: string;
    onChange?: (blocks: PartialBlock[], markdown: string) => void;
    readOnly?: boolean;
    pendingQuestionId?: string | null;
    onQuestionInserted?: () => void;
}

export function RichTextEditor({
    initialBlocks,
    initialMarkdown,
    onChange,
    readOnly = false,
    pendingQuestionId,
    onQuestionInserted,
}: RichTextEditorProps) {
    const isApplyingExternalChangeRef = useRef(false);
    const lastLoadedContentRef = useRef<string>("");
    const editor = useCreateBlockNote({
        dictionary: zh,
        uploadFile: async (file: File) => {
            const res = await api.uploadMedia(file);
            return res.url;
        },
    });

    const externalContentSignature = useMemo(
        () => JSON.stringify({ initialBlocks: initialBlocks ?? null, initialMarkdown: initialMarkdown ?? "" }),
        [initialBlocks, initialMarkdown]
    );

    useEffect(() => {
        async function loadContent() {
            try {
                if (lastLoadedContentRef.current === externalContentSignature) {
                    return;
                }

                isApplyingExternalChangeRef.current = true;

                if (initialBlocks && initialBlocks.length > 0) {
                    editor.replaceBlocks(editor.document, initialBlocks as PartialBlock[]);
                } else if (initialMarkdown) {
                    const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
                    editor.replaceBlocks(
                        editor.document,
                        blocks.length > 0 ? blocks : [{ type: "paragraph" }]
                    );
                } else {
                    editor.replaceBlocks(editor.document, [{ type: "paragraph" }]);
                }

                lastLoadedContentRef.current = externalContentSignature;
            } catch (error) {
                console.error("[RichTextEditor] Failed to load content", error);
            } finally {
                isApplyingExternalChangeRef.current = false;
            }
        }

        void loadContent();
    }, [editor, externalContentSignature, initialBlocks, initialMarkdown]);

    useEffect(() => {
        async function insertQuestionReference() {
            if (!pendingQuestionId) {
                return;
            }

            try {
                const cursorPosition = editor.getTextCursorPosition();
                const referenceBlock = cursorPosition.block.id ?? editor.document.at(-1)?.id;
                const questionBlock: PartialBlock = {
                    type: "paragraph",
                    content: `:::question{id=${pendingQuestionId}}`,
                };

                if (referenceBlock) {
                    editor.insertBlocks([questionBlock], referenceBlock, "after");
                } else {
                    editor.replaceBlocks(editor.document, [questionBlock]);
                }

                const blocks = editor.document as PartialBlock[];
                const markdown = await editor.blocksToMarkdownLossy(editor.document);
                onChange?.(blocks, markdown);
            } catch (error) {
                console.error("[RichTextEditor] Failed to insert question reference", error);
            } finally {
                onQuestionInserted?.();
            }
        }

        void insertQuestionReference();
    }, [editor, onChange, onQuestionInserted, pendingQuestionId]);

    return (
        <div className="w-full min-h-[500px] rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-200 overflow-visible lg:p-4">
            <BlockNoteView
                editor={editor}
                editable={!readOnly}
                theme="dark"
                onChange={async () => {
                    if (isApplyingExternalChangeRef.current) {
                        return;
                    }

                    const blocks = editor.document as PartialBlock[];
                    const markdown = await editor.blocksToMarkdownLossy(editor.document);
                    onChange?.(blocks, markdown);
                }}
            />
        </div>
    );
}
