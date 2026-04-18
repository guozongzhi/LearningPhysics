// 简单的 Markdown 到 HTML 转换
export function markdownToHtml(markdown: string): string {
    if (!markdown) return "";

    let html = markdown;

    // 标题
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // 粗体和斜体
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // 代码块 - 使用 [\s\S] 来匹配所有字符包括换行
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // 行内代码
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // PDF 附件
    html = html.replace(/\[PDF:(.*?)\]\((.*?)\)/g, '<div data-type="pdf-node" data-url="$2" data-filename="$1"></div>');

    // 一般文件附件
    html = html.replace(/\[FILE:(.*?)\|([^\]]*?)\]\((.*?)\)/g, '<div data-type="document-node" data-url="$3" data-filename="$1" data-file-type="$2"></div>');
    html = html.replace(/\[FILE:(.*?)\]\((.*?)\)/g, '<div data-type="document-node" data-url="$2" data-filename="$1" data-file-type="other"></div>');

    // 段落
    html = html.replace(/^(?!<[hpu])(.*)$/gim, "<p>$1</p>");

    // 列表 - 不使用 's' 标志，因为兼容性问题
    html = html.replace(/^- (.*$)/gim, "<li>$1</li>");

    return html;
}

// HTML 到简单 Markdown 的转换（用于保存）
export function htmlToMarkdown(html: string): string {
    if (!html) return "";

    let markdown = html;

    // 标题
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, "### $1\n");
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, "## $1\n");
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, "# $1\n");

    // 粗体和斜体
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1**");
    markdown = markdown.replace(/<em>(.*?)<\/em>/g, "*$1*");

    // 代码块
    markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, "```$1```");

    // 行内代码
    markdown = markdown.replace(/<code>(.*?)<\/code>/g, "`$1`");

    // 链接
    markdown = markdown.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, "[$2]($1)");

    // 图片
    markdown = markdown.replace(/<img src="([^"]+)" alt="([^"]*)"[^>]*>/g, "![$2]($1)");
    markdown = markdown.replace(/<img src="([^"]+)"[^>]*>/g, "![]($1)");

    // PDF 附件
    markdown = markdown.replace(/<div[^>]*data-type="pdf-node"[^>]*data-url="([^"]+)"[^>]*data-filename="([^"]+)"[^>]*>.*?<\/div>/g, "[PDF:$2]($1)");
    markdown = markdown.replace(/<div[^>]*data-url="([^"]+)"[^>]*data-filename="([^"]+)"[^>]*data-type="pdf-node"[^>]*>.*?<\/div>/g, "[PDF:$2]($1)");

    // 一般文件附件
    markdown = markdown.replace(/<div[^>]*data-type="document-node"[^>]*data-url="([^"]+)"[^>]*data-filename="([^"]+)"[^>]*data-file-type="([^"]+)"[^>]*>.*?<\/div>/g, "[FILE:$2|$3]($1)");
    markdown = markdown.replace(/<div[^>]*data-url="([^"]+)"[^>]*data-filename="([^"]+)"[^>]*data-file-type="([^"]+)"[^>]*data-type="document-node"[^>]*>.*?<\/div>/g, "[FILE:$2|$3]($1)");

    // 段落
    markdown = markdown.replace(/<p>(.*?)<\/p>/g, "$1\n\n");

    // 列表
    markdown = markdown.replace(/<ul>([\s\S]*?)<\/ul>/g, "$1");
    markdown = markdown.replace(/<li>(.*?)<\/li>/g, "- $1\n");

    // 清理 HTML 标签
    markdown = markdown.replace(/<[^>]+>/g, "");

    // 清理多余的换行
    markdown = markdown.replace(/\n{3,}/g, "\n\n");

    return markdown.trim();
}
