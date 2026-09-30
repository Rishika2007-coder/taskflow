import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard, { Task } from './TaskCard';

export interface Column {
  id: string;
  title: string;
  position: number;
  tasks: Task[];
}

interface Props {
  column: Column;
  onAddTask: (columnId: string, title: string, dueDate?: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export default function BoardColumn({ column, onAddTask, onEditTask, onDeleteTask, onRenameColumn, onDeleteColumn }: Props) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAddTask(column.id, newTitle.trim(), newDueDate || undefined);
      setNewTitle('');
      setNewDueDate('');
    }
  };

  const handleRename = () => {
    if (titleValue.trim() && titleValue !== column.title) {
      onRenameColumn(column.id, titleValue.trim());
    }
    setEditingTitle(false);
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="font-semibold border rounded px-2 py-1 text-sm w-full dark:bg-gray-800 dark:text-white"
            autoFocus
          />
        ) : (
          <h2
            className="font-semibold cursor-pointer dark:text-white"
            onClick={() => { setTitleValue(column.title); setEditingTitle(true); }}
            title="Click to rename"
          >
            {column.title}
          </h2>
        )}
        <button
          onClick={() => onDeleteColumn(column.id)}
          className="text-gray-400 hover:text-red-500 text-sm ml-2"
          title="Delete column"
        >
          ×
        </button>
      </div>
      <div ref={setNodeRef} className="min-h-[100px]">
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>
      <div className="mt-3 space-y-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add a task..."
          className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
          <button onClick={handleAdd} className="text-blue-600 text-sm font-medium px-2">+</button>
        </div>
      </div>
    </div>
  );
}
