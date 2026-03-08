"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * MindmapView renders an interactive mind map from Markdown content.
 * Uses markmap-lib to parse Markdown headings into a tree and markmap-view to render as SVG.
 */
type MindmapViewProps = {
    content: string;
    emptyText?: string;
};

export function MindmapView({ content, emptyText = "编写 Markdown 标题后，这里会自动生成思维导图。" }: MindmapViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const markmapRef = useRef<any>(null);

    const renderMindmap = useCallback(async () => {
        if (!svgRef.current) return;

        const { Transformer } = await import("markmap-lib");
        const { Markmap } = await import("markmap-view");

        const transformer = new Transformer();
        const { root } = transformer.transform(content || "# 空文档");

        if (!markmapRef.current) {
            // First render: create the Markmap instance
            svgRef.current.innerHTML = "";
            markmapRef.current = Markmap.create(svgRef.current, {
                autoFit: true,
                duration: 300,
                zoom: true,
                pan: true,
            }, root);
        } else {
            // Subsequent renders: update data
            markmapRef.current.setData(root);
            markmapRef.current.fit();
        }
    }, [content]);

    useEffect(() => {
        renderMindmap();
    }, [renderMindmap]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (markmapRef.current) {
                markmapRef.current.destroy?.();
                markmapRef.current = null;
            }
        };
    }, []);

    if (!content.trim()) {
        return <div className="text-sm text-slate-500">{emptyText}</div>;
    }

    return (
        <div className="relative h-full min-h-[460px] rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden markmap-dark-theme">
            <style dangerouslySetInnerHTML={{
                __html: `
                .markmap-dark-theme svg text {
                    fill: #e2e8f0 !important;
                    font-size: 14px;
                }
                .markmap-dark-theme svg path {
                    stroke: #38bdf8 !important;
                }
                .markmap-dark-theme svg g {
                    fill: #e2e8f0 !important;
                }
                .markmap-dark-theme svg circle {
                    stroke: #0ea5e9 !important;
                    fill: #0f172a !important;
                }
                .markmap-dark-theme svg rect {
                    fill: #1e293b !important;
                    stroke: #334155 !important;
                }
            `}} />
            <svg ref={svgRef} className="h-full w-full" style={{ minHeight: "460px" }} />
            <div className="absolute bottom-3 right-3 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 backdrop-blur">
                滚轮缩放 · 拖拽平移 · 点击折叠
            </div>
        </div>
    );
}
