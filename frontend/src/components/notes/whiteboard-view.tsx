"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export interface ExcalidrawSceneData {
    sdk: "excalidraw";
    version: number;
    elements: readonly ExcalidrawElement[];
    appState?: Partial<AppState>;
    files?: BinaryFiles;
}

interface WhiteboardViewProps {
    initialData?: unknown;
    onChange?: (data: ExcalidrawSceneData) => void;
    readOnly?: boolean;
    fullHeight?: boolean;
}

const WhiteboardCanvas = dynamic(
    () => import("./whiteboard-canvas").then((module) => module.WhiteboardCanvas),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[600px] items-center justify-center text-sm text-slate-400">
                正在加载白板...
            </div>
        ),
    }
);

function normalizeInitialData(initialData: unknown): ExcalidrawSceneData | undefined {
    if (!initialData || typeof initialData !== "object") {
        return undefined;
    }

    const data = initialData as Record<string, unknown>;
    const elements = Array.isArray(data.elements) ? (data.elements as readonly ExcalidrawElement[]) : [];

    // Sanitize appState to remove ephemeral fields like collaborators which cause crashes
    // if serialized as plain objects instead of Maps.
    let appState = typeof data.appState === "object" && data.appState !== null
        ? { ...data.appState as Partial<AppState> }
        : undefined;

    if (appState) {
        // Excalidraw internal state like collaborators/toast/etc should not be persisted or re-initialized from plain objects
        delete (appState as any).collaborators;
        delete (appState as any).toast;

        // Also ensure we don't accidentally carry over UI state that might conflict
        delete (appState as any).activeTool;
        delete (appState as any).openMenu;
        delete (appState as any).openPopup;
    }

    const files = typeof data.files === "object" && data.files !== null
        ? (data.files as BinaryFiles)
        : undefined;

    return {
        sdk: "excalidraw",
        version: typeof data.version === "number" ? data.version : 1,
        elements,
        appState,
        files,
    };
}

export function WhiteboardView({ initialData, onChange, readOnly = false, fullHeight = false }: WhiteboardViewProps) {
    const normalizedInitialData = useMemo(() => normalizeInitialData(initialData), [initialData]);

    return (
        <div className={`relative w-full ${fullHeight ? "h-full" : "h-[600px]"} overflow-hidden rounded-md border border-slate-300 bg-white`}>
            <WhiteboardCanvas
                initialData={normalizedInitialData}
                onChange={onChange}
                readOnly={readOnly}
            />
        </div>
    );
}
