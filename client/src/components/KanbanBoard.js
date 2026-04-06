import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Moon, Sun } from 'lucide-react';
import TaskCard from './TaskCard';
import NotificationBell from './NotificationBell';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export default function KanbanBoard({ project, tasks, teamMembers, filterAssignee, onFilterAssignee, onMoveTask, onEditTask, onDeleteTask, onNewTask, darkMode, onToggleDark }) {
  const grouped = useMemo(() => {
    const g = { todo: [], in_progress: [], done: [] };
    tasks.forEach(t => { if (g[t.status]) g[t.status].push(t); });
    Object.values(g).forEach(col => col.sort((a, b) => a.position - b.position));
    return g;
  }, [tasks]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const taskId = parseInt(draggableId);
    onMoveTask(taskId, destination.droppableId, destination.index);
  };

  if (!project) {
    return (
      <div className="kanban-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No project selected
      </div>
    );
  }

  return (
    <div className="kanban-area">
      <div className="kanban-header">
        <div>
          <h1>{project.name}</h1>
        </div>
        <div className="kanban-header-actions">
          <div className="filter-bar">
            <button
              className={`filter-chip ${!filterAssignee ? 'active' : ''}`}
              onClick={() => onFilterAssignee(null)}
            >
              All
            </button>
            {teamMembers.map(m => (
              <button
                key={m.id}
                className={`filter-chip ${filterAssignee === m.id ? 'active' : ''}`}
                onClick={() => onFilterAssignee(filterAssignee === m.id ? null : m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          <NotificationBell />
          <button className="btn-icon" onClick={onToggleDark} title="Toggle dark mode">
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="btn btn-primary" onClick={onNewTask}>
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-columns">
          {COLUMNS.map(col => (
            <div className="kanban-column" key={col.id}>
              <div className="kanban-column-header">
                {col.label}
                <span className="kanban-column-count">{grouped[col.id].length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    className={`kanban-column-body ${snapshot.isDraggingOver ? 'column-drop-area drag-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {grouped[col.id].map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                            <TaskCard
                              task={task}
                              onClick={onEditTask}
                              isDragging={snap.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
