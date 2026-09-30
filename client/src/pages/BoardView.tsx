import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { api } from '../api/axios';
import { getSocket } from '../api/socket';
import Navbar from '../components/Navbar';
import BoardColumn, { Column } from '../components/BoardColumn';
import { Task, Label } from '../components/TaskCard';

export default function BoardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<Column[]>([]);
  const [boardTitle, setBoardTitle] = useState('');
  const [, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get(`/boards/${id}`);
      setColumns(res.data.columns);
      setBoardTitle(res.data.title);
      setLabels(res.data.labels || []);
    } catch {
      setError('Board not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Real-time sync
  useEffect(() => {
    const socket = getSocket();
    socket.emit('board:join', id);

    const onCreated = (task: Task) => {
      setColumns((prev) =>
        prev.map((c) =>
          c.id === task.columnId ? { ...c, tasks: [...c.tasks, task] } : c
        )
      );
    };

    const onUpdated = (task: Task) => {
      setColumns((prev) =>
        prev.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) => (t.id === task.id ? task : t)),
        }))
      );
    };

    const onMoved = (task: Task) => {
      setColumns((prev) => {
        const newCols = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
        newCols.forEach((c) => {
          c.tasks = c.tasks.filter((t) => t.id !== task.id);
        });
        const target = newCols.find((c) => c.id === task.columnId);
        if (target) {
          target.tasks.splice(task.position, 0, task);
        }
        return newCols;
      });
    };

    const onDeleted = ({ id: taskId }: { id: string }) => {
      setColumns((prev) =>
        prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }))
      );
    };

    const onColumnCreated = (column: Column) => {
      setColumns((prev) => [...prev, { ...column, tasks: [] }]);
    };

    const onColumnUpdated = (column: Column) => {
      setColumns((prev) =>
        prev.map((c) => (c.id === column.id ? { ...c, title: column.title } : c))
      );
    };

    const onColumnDeleted = ({ id: columnId }: { id: string }) => {
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
    };

    const onLabelCreated = (label: Label) => {
      setLabels((prev) => [...prev, label]);
    };

    const onLabelUpdated = (label: Label) => {
      setLabels((prev) => prev.map((l) => (l.id === label.id ? label : l)));
    };

    const onLabelDeleted = ({ id: labelId }: { id: string }) => {
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
    };

    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:moved', onMoved);
    socket.on('task:deleted', onDeleted);
    socket.on('column:created', onColumnCreated);
    socket.on('column:updated', onColumnUpdated);
    socket.on('column:deleted', onColumnDeleted);
    socket.on('label:created', onLabelCreated);
    socket.on('label:updated', onLabelUpdated);
    socket.on('label:deleted', onLabelDeleted);

    return () => {
      socket.emit('board:leave', id);
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:moved', onMoved);
      socket.off('task:deleted', onDeleted);
      socket.off('column:created', onColumnCreated);
      socket.off('column:updated', onColumnUpdated);
      socket.off('column:deleted', onColumnDeleted);
      socket.off('label:created', onLabelCreated);
      socket.off('label:updated', onLabelUpdated);
      socket.off('label:deleted', onLabelDeleted);
    };
  }, [id]);

  const findColumnByTaskId = (taskId: string) => {
    return columns.find((col) => col.tasks.some((t) => t.id === taskId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const sourceColumn = findColumnByTaskId(taskId);
    if (!sourceColumn) return;

    let targetColumn = columns.find((c) => c.id === over.id);
    if (!targetColumn) {
      targetColumn = findColumnByTaskId(over.id as string);
    }
    if (!targetColumn) return;

    const task = sourceColumn.tasks.find((t) => t.id === taskId)!;

    setColumns((prev) => {
      const newCols = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const src = newCols.find((c) => c.id === sourceColumn.id)!;
      const tgt = newCols.find((c) => c.id === targetColumn!.id)!;

      src.tasks = src.tasks.filter((t) => t.id !== taskId);

      let insertIndex = tgt.tasks.length;
      const overIndex = tgt.tasks.findIndex((t) => t.id === over.id);
      if (overIndex !== -1) insertIndex = overIndex;

      tgt.tasks.splice(insertIndex, 0, { ...task, columnId: targetColumn!.id });
      return newCols;
    });

    const newPosition = targetColumn.tasks.findIndex((t) => t.id === taskId);
    try {
      await api.patch(`/tasks/${taskId}/move`, {
        columnId: targetColumn.id,
        position: newPosition,
      });
    } catch {
      fetchBoard();
    }
  };

  const addTask = async (columnId: string, title: string, dueDate?: string) => {
    const res = await api.post(`/columns/${columnId}/tasks`, { title, dueDate });
    setColumns((prev) =>
      prev.map((c) =>
        c.id === columnId ? { ...c, tasks: [...c.tasks, res.data] } : c
      )
    );
  };

  const editTask = async (task: Task) => {
    const newTitle = prompt('Task title', task.title);
    if (!newTitle) return;
    const newDueDate = prompt('Due date (YYYY-MM-DD)', task.dueDate?.split('T')[0] || '');
    await api.patch(`/tasks/${task.id}`, { title: newTitle, dueDate: newDueDate || null });
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === task.id ? { ...t, title: newTitle, dueDate: newDueDate || null } : t)),
      }))
    );
  };

  const deleteTask = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    setColumns((prev) =>
      prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== id) }))
    );
  };

  const addColumn = async () => {
    if (!newColumnTitle.trim()) return;
    await api.post(`/boards/${id}/columns`, { title: newColumnTitle.trim() });
    setNewColumnTitle('');
    setShowAddColumn(false);
  };

  const renameColumn = async (columnId: string, title: string) => {
    await api.patch(`/columns/${columnId}`, { title });
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, title } : c))
    );
  };

  const deleteColumn = async (columnId: string) => {
    await api.delete(`/columns/${columnId}`);
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
  };

  const addLabel = async () => {
    if (!newLabelName.trim()) return;
    await api.post(`/boards/${id}/labels`, { name: newLabelName.trim(), color: newLabelColor });
    setNewLabelName('');
    setShowAddLabel(false);
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return;
    await api.post(`/boards/${id}/invite`, { email: inviteEmail.trim() });
    setInviteEmail('');
    setShowInvite(false);
  };

  const filteredColumns = columns.map((col) => ({
    ...col,
    tasks: col.tasks.filter((t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    ),
  }));

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate('/boards')} className="text-blue-600 hover:text-blue-700 text-sm mb-1">
              &larr; Back
            </button>
            <h1 className="text-2xl font-bold dark:text-white">{boardTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="border dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setShowAddColumn(!showAddColumn)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Column
          </button>
          <button
            onClick={() => setShowAddLabel(!showAddLabel)}
            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            + Label
          </button>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            + Invite
          </button>
        </div>

        {showAddColumn && (
          <div className="flex gap-2 mb-4">
            <input
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Column title"
              className="border rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
              onKeyDown={(e) => e.key === 'Enter' && addColumn()}
              autoFocus
            />
            <button onClick={addColumn} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg">Add</button>
          </div>
        )}

        {showAddLabel && (
          <div className="flex gap-2 mb-4 items-center">
            <input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Label name"
              className="border rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
            <input
              type="color"
              value={newLabelColor}
              onChange={(e) => setNewLabelColor(e.target.value)}
              className="w-10 h-9 rounded-lg cursor-pointer border dark:border-gray-700"
            />
            <button onClick={addLabel} className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg">Add</button>
          </div>
        )}

        {showInvite && (
          <div className="flex gap-2 mb-4">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="User email"
              className="border rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
              onKeyDown={(e) => e.key === 'Enter' && inviteUser()}
            />
            <button onClick={inviteUser} className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg">Invite</button>
          </div>
        )}

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {filteredColumns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onAddTask={addTask}
                onEditTask={editTask}
                onDeleteTask={deleteTask}
                onRenameColumn={renameColumn}
                onDeleteColumn={deleteColumn}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 shadow-2xl opacity-90 rotate-2">
                <h3 className="font-medium text-sm dark:text-white">{activeTask.title}</h3>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
