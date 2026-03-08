import React, { useState } from 'react';
import { api } from '@/lib/api';

type KnowledgeTagProps = {
    nodeId: number;
    title: string;
    topics: any[];
    selectedNodeIds: number[];
    setSelectedNodeIds: (ids: number[]) => void;
};

export const KnowledgeTag: React.FC<KnowledgeTagProps> = ({
    nodeId,
    title,
    topics,
    selectedNodeIds,
    setSelectedNodeIds,
}) => {
    const [nodeTitle, setNodeTitle] = useState(title);

    const handleEdit = async () => {
        const newName = window.prompt('编辑知识点名称', nodeTitle);
        if (!newName || newName === nodeTitle) return;
        try {
            const data = await api.updateKnowledgeNode(nodeId, { name: newName });
            setNodeTitle(data.name);
        } catch (e) {
            console.error(e);
            alert('更新失败，可能是权限不足或后端异常');
        }
    };

    const handleRemove = () => {
        setSelectedNodeIds(selectedNodeIds.filter((id) => id !== nodeId));
    };

    return (
        <span className="flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-200">
            {nodeTitle}
            <button onClick={handleEdit} className="ml-1 text-sky-300 hover:text-sky-100">
                ✏️
            </button>
            <button onClick={handleRemove} className="ml-1 text-rose-400 hover:text-rose-200">
                ✕
            </button>
        </span>
    );
};
