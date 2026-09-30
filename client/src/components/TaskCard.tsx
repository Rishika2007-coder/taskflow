import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  position: number;
  columnId: string;
  labels: { label: Label }[];
}

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3 mb-2 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      {task.labels.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {task.labels.map(({ label }) => (
            <span
              key={label.id}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
      <h3 className="font-medium text-sm dark:text-white">{task.title}</h3>
      {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>}
      {task.dueDate && (
        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="text-xs text-blue-500 hover:underline"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="text-xs text-red-500 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
