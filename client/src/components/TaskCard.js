import React from 'react';
import { Calendar } from 'lucide-react';

function formatDue(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((due - now) / (1000 * 60 * 60 * 24));

  let label, className;
  if (diff < 0) { label = `${Math.abs(diff)}d overdue`; className = 'overdue'; }
  else if (diff === 0) { label = 'Today'; className = 'soon'; }
  else if (diff === 1) { label = 'Tomorrow'; className = 'soon'; }
  else if (diff <= 3) { label = `in ${diff}d`; className = 'soon'; }
  else {
    label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    className = 'neutral';
  }
  return { label, className };
}

export default function TaskCard({ task, onClick, dragHandleProps, isDragging }) {
  const due = formatDue(task.due_date);

  return (
    <div
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      onClick={() => onClick(task)}
      {...(dragHandleProps || {})}
    >
      <div className="task-card-title">{task.title}</div>
      {task.description && <div className="task-card-desc">{task.description}</div>}
      <div className="task-card-meta">
        <span className={`task-priority ${task.priority}`}>{task.priority}</span>
        {due && (
          <span className={`task-due ${due.className}`}>
            <Calendar size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
            {due.label}
          </span>
        )}
        {task.assignee_name && (
          <span
            className="task-assignee"
            style={{ background: task.assignee_color || '#6366f1' }}
            title={task.assignee_name}
          >
            {task.assignee_initials || task.assignee_name[0]}
          </span>
        )}
      </div>
    </div>
  );
}
