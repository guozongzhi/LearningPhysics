"use client";

type TopicItem = {
  id: number;
  name: string;
  code: string;
  parent_id: number | null;
  level: number;
  question_count: number;
};

type TopicTreeSelectorProps = {
  topics: TopicItem[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
};

type TopicNode = TopicItem & { children: TopicNode[] };

function buildTopicTree(topics: TopicItem[]): TopicNode[] {
  const nodeMap = new Map<number, TopicNode>();
  const roots: TopicNode[] = [];

  topics.forEach((topic) => {
    nodeMap.set(topic.id, { ...topic, children: [] });
  });

  nodeMap.forEach((node) => {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: TopicNode[]) => {
    nodes.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "zh-CN"));
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

function TopicNodeItem({
  node,
  selectedIds,
  onToggle,
  depth,
}: {
  node: TopicNode;
  selectedIds: number[];
  onToggle: (id: number) => void;
  depth: number;
}) {
  const checked = selectedIds.includes(node.id);

  return (
    <div className="space-y-2">
      <label
        className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2.5"
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(node.id)}
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-400"
        />
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-100">{node.name}</div>
          <div className="text-xs text-slate-400">
            {node.code} · L{node.level} · 题目 {node.question_count}
          </div>
        </div>
      </label>
      {node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((child) => (
            <TopicNodeItem key={child.id} node={child} selectedIds={selectedIds} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TopicTreeSelector({ topics, selectedIds, onChange }: TopicTreeSelectorProps) {
  const roots = buildTopicTree(topics);

  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((currentId) => currentId !== id));
      return;
    }
    onChange([...selectedIds, id].sort((left, right) => left - right));
  };

  if (roots.length === 0) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-4 text-sm text-slate-500">暂无可选知识点。</div>;
  }

  return (
    <div className="space-y-3">
      {roots.map((node) => (
        <TopicNodeItem key={node.id} node={node} selectedIds={selectedIds} onToggle={handleToggle} depth={0} />
      ))}
    </div>
  );
}
