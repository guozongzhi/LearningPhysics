"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useCallback, useState, useEffect, useRef } from "react";

interface HtmlNodeOptions {
    HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        htmlNode: {
            setHtmlNode: (html: string) => ReturnType;
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
                parseHTML: element => element.getAttribute("data-html"),
                renderHTML: attributes => {
                    return {
                        "data-html": attributes.html,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="html-node"]',
                getAttrs: element => {
                    if (typeof element === 'string') return null;
                    return {
                        html: element.getAttribute('data-html') || '',
                    };
                },
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "html-node",
            }),
            [
                "iframe",
                {
                    srcdoc: `<!DOCTYPE html><html><head><style>body{margin:0;font-family:sans-serif;color:#cbd5e1;overflow:hidden;}</style></head><body>${node.attrs.html}</body></html>`,
                    style: "width:100%;border:none;min-height:30px;",
                    onload: "this.style.height=this.contentWindow.document.body.scrollHeight+'px';parent.postMessage({type:'setHeight',height:this.contentWindow.document.body.scrollHeight},'*');",
                },
            ],
        ];
    },

    addCommands() {
        return {
            setHtmlNode:
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

function HtmlNodeComponent({ node, updateAttributes, selected }: NodeViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [htmlValue, setHtmlValue] = useState(node.attrs.html);

    const handleSave = useCallback(() => {
        updateAttributes({ html: htmlValue });
        setIsEditing(false);
    }, [htmlValue, updateAttributes]);

    return (
        <NodeViewWrapper>
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
                    <div className="relative group p-4 min-h-[100px]">
                        <HtmlIframe html={node.attrs.html} />
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded hover:bg-slate-600 z-10"
                        >
                            编辑
                        </button>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

function HtmlIframe({ html }: { html: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState("100px");

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "setHeight" && iframeRef.current?.contentWindow === event.source) {
                setHeight(`${event.data.height}px`);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden !important;
            font-family: system-ui, -apple-system, sans-serif;
            color: #cbd5e1;
            background: transparent;
          }
          #content {
            display: inline-block;
            min-width: 100%;
            box-sizing: border-box;
            transform-origin: top left;
          }
          button { cursor: pointer; }
        </style>
      </head>
      <body>
        <div id="content">${html || "<p style='color: #64748b; font-size: 0.875rem;'>\u70b9\u51fb\u7f16\u8f91 HTML</p>"}</div>
        <script>
          let fitting = false;
          function autoFit() {
            if (fitting) return;
            fitting = true;
            
            const content = document.getElementById('content');
            if (!content) {
              fitting = false;
              return;
            }
            
            // 1. 重置缩放和宽度以获取真实自然尺寸
            content.style.transform = 'none';
            content.style.width = 'auto';
            
            // 2. 测量内容的物理自然尺寸
            const contentWidth = content.scrollWidth;
            const contentHeight = content.scrollHeight;
            const availableWidth = window.innerWidth;
            
            let scale = 1;
            if (contentWidth > availableWidth + 2) {
              scale = availableWidth / contentWidth;
            }
            
            // 3. 应用 transform 缩放
            content.style.transform = 'scale(' + scale + ')';
            
            // 4. 根据缩放比例锁定宽度，防止折行
            if (scale < 1) {
              content.style.width = contentWidth + 'px';
            } else {
              content.style.width = '100%';
            }
            
            // 5. 核心修复：物理高度严格设为 缩放后的高度 + 少量偏移，消除被拉长产生的空白
            const height = Math.ceil(contentHeight * scale) + 4;
            window.parent.postMessage({ type: 'setHeight', height }, '*');
            
            fitting = false;
          }
          
          // 延迟和微任务触发自适应，确保内容渲染完毕
          setTimeout(autoFit, 100);
          requestAnimationFrame(autoFit);
          
          // 使用 ResizeObserver 监听内容边界变化
          const observer = new ResizeObserver(() => {
            autoFit();
          });
          observer.observe(document.body);
          
          window.addEventListener('resize', autoFit);
        </script>
      </body>
    </html>
  `;

    return (
        <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            style={{ width: "100%", height, border: "none", display: "block" }}
            title="HTML Preview"
            sandbox="allow-scripts"
        />
    );
}
