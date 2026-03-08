"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawInitialDataState, UIOptions } from "@excalidraw/excalidraw/types";
import { useRef, useState } from "react";

import type { ExcalidrawSceneData } from "./whiteboard-view";

interface WhiteboardCanvasProps {
    initialData?: ExcalidrawSceneData;
    onChange?: (data: ExcalidrawSceneData) => void;
    readOnly?: boolean;
}

function serializeSceneData(data: ExcalidrawSceneData | undefined) {
    return JSON.stringify(data ?? null);
}

const whiteboardUIOptions: UIOptions = {
    canvasActions: {
        toggleTheme: false,
    },
};

export function WhiteboardCanvas({ initialData, onChange, readOnly = false }: WhiteboardCanvasProps) {
    const [initialSceneData] = useState(() => initialData as ExcalidrawInitialDataState | undefined);
    const lastSceneSignatureRef = useRef(serializeSceneData(initialData));

    return (
        <div className="whiteboard-canvas h-full w-full">
            <Excalidraw
                initialData={initialSceneData}
                langCode="zh-CN"
                UIOptions={whiteboardUIOptions}
                onChange={(elements, appState, files) => {
                    const nextScene: ExcalidrawSceneData = {
                        sdk: "excalidraw",
                        version: 1,
                        elements: [...elements],
                        appState,
                        files,
                    };
                    const nextSignature = serializeSceneData(nextScene);

                    if (nextSignature === lastSceneSignatureRef.current) {
                        return;
                    }

                    lastSceneSignatureRef.current = nextSignature;
                    onChange?.(nextScene);
                }}
                viewModeEnabled={readOnly}
                theme="light"
            />
            <style jsx>{`
                .whiteboard-canvas :global(a[href="https://github.com/excalidraw/excalidraw"]),
                .whiteboard-canvas :global(a[href="https://x.com/excalidraw"]),
                .whiteboard-canvas :global(a[href="https://discord.gg/UexuTaE"]),
                .whiteboard-canvas :global([data-testid="copyElementLink"]),
                .whiteboard-canvas :global([data-testid="linkToElement"]),
                .whiteboard-canvas :global([aria-label="导出链接"]),
                .whiteboard-canvas :global([aria-label="Export to link"]),
                .whiteboard-canvas :global(.excalidraw-link) {
                    display: none !important;
                }

                .whiteboard-canvas :global(.dropdown-menu-group:has(.dropdown-menu-item__label)) {
                    display: block;
                }

                .whiteboard-canvas :global(.dropdown-menu-group:has([title="Excalidraw links"])),
                .whiteboard-canvas :global(.dropdown-menu-group:has(*:contains("Excalidraw links"))) {
                    display: none !important;
                }

                .whiteboard-canvas :global(.Card:has([aria-label="导出链接"])),
                .whiteboard-canvas :global(.Card:has([aria-label="Export to link"])) {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
