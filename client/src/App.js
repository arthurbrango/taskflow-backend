import React, { useState, useEffect, useCallback } from 'react';
import { auth, projects as projectsApi, tasks as tasksApi, team as teamApi } from './api';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import EmailPanel from './components/EmailPanel';
import LoginPage from './components/LoginPage';
import AccessDenied from './components/AccessDenied';
import TaskModal from './components/TaskModal';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [projectsList, setProjectsList] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasksList, setTasksList] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filterAssignee, setFilterAssignee] = useState(null);
  const [emailOpen, setEmailOpen] = useState(true);
  const [modal, setModal] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tf-dark') === 'true');
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'admin'

  const isAccessDenied = window.location.pathname === '/access-denied';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('tf-dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    auth.me().then(d => setUser(d.user)).catch(() => setUser(null));
  }, []);

  const loadTeam = useCallback(() => {
    teamApi.list().then(setTeamMembers);
  }, []);

  useEffect(() => {
    if (!user) return;
    projectsApi.list().then(p => {
      setProjectsList(p);
      if (p.length > 0 && !activeProject) setActiveProject(p[0]);
    });
    loadTeam();
  }, [user]); // eslint-disable-line

  const loadTasks = useCallback(() => {
    if (!activeProject) return;
    tasksApi.list(activeProject.id, filterAssignee).then(setTasksList);
  }, [activeProject, filterAssignee]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleAddProject = async (name) => {
    const p = await projectsApi.create(name);
    setProjectsList(prev => [...prev, p]);
    setActiveProject(p);
  };

  const handleDeleteProject = async (id) => {
    await projectsApi.remove(id);
    setProjectsList(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activeProject?.id === id) setActiveProject(next[0] || null);
      return next;
    });
  };

  const handleCreateTask = async (data) => {
    await tasksApi.create({ ...data, project_id: activeProject.id });
    loadTasks();
    setModal(null);
  };

  const handleUpdateTask = async (id, data) => {
    await tasksApi.update(id, data);
    loadTasks();
    setModal(null);
  };

  const handleMoveTask = async (id, status, position) => {
    await tasksApi.move(id, status, position);
    loadTasks();
  };

  const handleDeleteTask = async (id) => {
    await tasksApi.remove(id);
    loadTasks();
  };

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
  };

  // Only show active members in board filters/assignees
  const activeMembers = teamMembers.filter(m => m.active !== 0);

  if (isAccessDenied) return <AccessDenied />;
  if (user === undefined) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading…</div>;
  if (!user) return <LoginPage />;

  return (
    <div className={`app-layout ${emailOpen && currentView === 'board' ? '' : 'email-closed'}`}>
      <Sidebar
        user={user}
        projects={projectsList}
        activeProject={activeProject}
        onSelectProject={(p) => { setActiveProject(p); setCurrentView('board'); }}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
        onToggleEmail={() => setEmailOpen(e => !e)}
        emailOpen={emailOpen}
        currentView={currentView}
        onShowAdmin={(show) => setCurrentView(show ? 'admin' : 'board')}
      />

      {currentView === 'board' && (
        <KanbanBoard
          project={activeProject}
          tasks={tasksList}
          teamMembers={activeMembers}
          filterAssignee={filterAssignee}
          onFilterAssignee={setFilterAssignee}
          onMoveTask={handleMoveTask}
          onEditTask={(task) => setModal({ mode: 'edit', task })}
          onDeleteTask={handleDeleteTask}
          onNewTask={() => setModal({ mode: 'create' })}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />
      )}

      {currentView === 'admin' && (
        <AdminPanel
          teamMembers={teamMembers}
          onUpdate={loadTeam}
          onBack={() => setCurrentView('board')}
        />
      )}

      {emailOpen && currentView === 'board' && <EmailPanel user={user} />}

      {modal && (
        <TaskModal
          mode={modal.mode}
          task={modal.task}
          teamMembers={activeMembers}
          onSave={modal.mode === 'create' ? handleCreateTask : (data) => handleUpdateTask(modal.task.id, data)}
          onClose={() => setModal(null)}
          onDelete={modal.mode === 'edit' ? () => { handleDeleteTask(modal.task.id); setModal(null); } : undefined}
        />
      )}
    </div>
  );
}
