"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { AppState, ExcalidrawInitialDataState, UIOptions } from "@excalidraw/excalidraw/types";
import { useEffect, useRef, useState } from "react";

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
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 使用 MutationObserver 来检测并隐藏 Excalidraw links
        const hideExcalidrawLinks = () => {
            // 找到所有下拉菜单
            const menus = document.querySelectorAll('.excalidraw .dropdown-menu, .dropdown-menu');
            menus.forEach(menu => {
                // 查找所有菜单项组
                const groups = menu.querySelectorAll('.dropdown-menu-group');
                groups.forEach(group => {
                    // 检查这个组是否包含 Excalidraw links 或画布背景
                    const text = group.textContent || '';
                    if (text.includes('Excalidraw') || text.includes('画布背景') || text.includes('canvas background')) {
                        (group as HTMLElement).style.display = 'none';
                    }
                });

                // 隐藏分割线
                const hrs = menu.querySelectorAll('hr');
                hrs.forEach(hr => {
                    (hr as HTMLElement).style.display = 'none';
                    // 隐藏分割线之后的所有元素
                    let next = hr.nextElementSibling;
                    while (next) {
                        (next as HTMLElement).style.display = 'none';
                        next = next.nextElementSibling;
                    }
                });
            });

            // 隐藏特定的链接和按钮
            const linksToHide = [
                'a[href="https://github.com/excalidraw/excalidraw"]',
                'a[href="https://x.com/excalidraw"]',
                'a[href="https://discord.gg/UexuTaE"]',
                '[data-testid="copyElementLink"]',
                '[data-testid="linkToElement"]',
                '[aria-label="导出链接"]',
                '[aria-label="Export to link"]',
            ];
            linksToHide.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    (el as HTMLElement).style.display = 'none';
                });
            });
        };

        // 立即执行一次
        hideExcalidrawLinks();

        // 使用 MutationObserver 监听 DOM 变化
        const observer = new MutationObserver(() => {
            hideExcalidrawLinks();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // 定期检查，防止 observer 漏掉
        const interval = setInterval(hideExcalidrawLinks, 500);

        return () => {
            observer.disconnect();
            clearInterval(interval);
        };
    }, []);

    return (
        <div ref={containerRef} className="whiteboard-canvas h-full w-full">
            <Excalidraw
                initialData={initialSceneData}
                langCode="zh-CN"
                UIOptions={whiteboardUIOptions}
                onChange={(elements, appState, files) => {
                    // Create a sanitized copy of appState to prevent non-persistent state
                    // like collaborators from being saved/restored as plain objects.
                    const { collaborators, toast, activeTool, openMenu, openPopup, ...persistentState } = appState;

                    const nextScene: ExcalidrawSceneData = {
                        sdk: "excalidraw",
                        version: 1,
                        elements: [...elements],
                        appState: persistentState as Partial<AppState>,
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
        </div>
    );
}
