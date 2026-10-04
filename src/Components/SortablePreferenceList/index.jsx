import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import PreferenceCard from '../PreferenceCard';

const SortablePreferenceList = ({ items, onReorder, onEdit, onSuccess }) => {
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    const handleDrop = (targetId) => {
        if (!draggingId || draggingId === targetId || !onReorder) return;

        const fromIndex = items.findIndex((item) => item.id === draggingId);
        const toIndex = items.findIndex((item) => item.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return;

        onReorder(fromIndex, toIndex);
        setDraggingId(null);
        setDragOverId(null);
    };

    return (
        <div className="flex flex-col gap-3 mt-4 w-full max-w-3xl">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(item.id);
                    }}
                    onDragLeave={() => {
                        if (dragOverId === item.id) setDragOverId(null);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(item.id);
                    }}
                    className="flex items-stretch gap-2 rounded-xl transition-all"
                    style={{
                        opacity: draggingId === item.id ? 0.6 : 1,
                        backgroundColor: dragOverId === item.id
                            ? 'rgba(67, 121, 238, 0.08)'
                            : 'transparent',
                        border: dragOverId === item.id
                            ? '2px dashed rgba(67, 121, 238, 0.45)'
                            : '2px solid transparent',
                    }}
                >
                    <div
                        draggable
                        onDragStart={(e) => {
                            setDraggingId(item.id);
                            e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverId(null);
                        }}
                        className="flex flex-col items-center justify-center px-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
                        style={{ color: 'var(--dashboard-text-secondary)' }}
                        title="Drag to reorder"
                    >
                        <GripVertical size={20} />
                        <span className="text-xs mt-1 font-semibold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <PreferenceCard
                            data={item}
                            onEdit={onEdit}
                            onSuccess={onSuccess}
                            fullWidth
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SortablePreferenceList;
