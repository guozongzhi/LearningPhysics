"use client";

import { Tldraw, Editor, getSnapshot, loadSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface WhiteboardViewProps {
    initialData?: unknown;
    onChange?: (data: unknown) => void;
    readOnly?: boolean;
}

export function WhiteboardView({ initialData, onChange, readOnly = false }: WhiteboardViewProps) {
    const editorRef = useRef<Editor | null>(null);
    const suppressOnChangeRef = useRef(false);
    const lastLoadedSnapshotRef = useRef<string>("");
    const initialDataSignature = useMemo(() => JSON.stringify(initialData ?? null), [initialData]);

    const handleMount = useCallback(
        (editor: Editor) => {
            editorRef.current = editor;

            if (onChange && !readOnly) {
                editor.store.listen(
                    () => {
                        if (suppressOnChangeRef.current) {
                            return;
                        }
                        onChange(getSnapshot(editor.store));
                    },
                    { scope: 'document', source: 'user' }
                );
            }
        },
        [onChange, readOnly]
    );

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || lastLoadedSnapshotRef.current === initialDataSignature) {
            return;
        }

        suppressOnChangeRef.current = true;
        try {
            if (initialData) {
                loadSnapshot(editor.store, initialData);
            }
            lastLoadedSnapshotRef.current = initialDataSignature;
        } catch (error) {
            console.error("Failed to load whiteboard snapshot", error);
        } finally {
            suppressOnChangeRef.current = false;
        }
    }, [initialData, initialDataSignature]);

    return (
        <div className="w-full h-[600px] border border-slate-700 rounded-md overflow-hidden relative">
            <Tldraw
                onMount={handleMount}
                hideUi={readOnly}
            />
        </div>
    );
}
