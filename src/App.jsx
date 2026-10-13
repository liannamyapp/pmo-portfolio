import React, { useState } from 'react';
import { useStore } from './store.jsx';
import Portfolio from './components/Portfolio.jsx';
import ProjectView from './components/ProjectView.jsx';
import Intake from './components/Intake.jsx';
import StatusReport from './components/StatusReport.jsx';
import Committee from './components/Committee.jsx';

const TABS = [
  { key: 'portfolio', label: 'Портфель' },
  { key: 'project', label: 'Проект' },
  { key: 'intake', label: 'Инициативы' },
  { key: 'status', label: 'Статус-отчёт' },
  { key: 'committee', label: 'Проектный комитет' },
];

export default function App() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState('portfolio');
  const [projectId, setProjectId] = useState(state.projects[0]?.id);

  const open = (id, to = 'project') => {
    setProjectId(id);
    setTab(to);
  };

  const project = state.projects.find((p) => p.id === projectId) ?? state.projects[0];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">PMO</span>
          <div>
            <strong>Портфель ИТ-проектов</strong>
            <small>Дирекция ИТ · руководитель проектов</small>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        <button
          className="ghost small"
          onClick={() => confirm('Сбросить данные к демонстрационным?') && dispatch({ type: 'reset' })}
        >
          Сбросить демо
        </button>
      </header>

      {['project', 'status'].includes(tab) && (
        <div className="picker">
          <span>Проект:</span>
          <select value={project?.id} onChange={(e) => setProjectId(e.target.value)}>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <main>
        {tab === 'portfolio' && <Portfolio onOpen={open} />}
        {tab === 'project' && project && <ProjectView project={project} />}
        {tab === 'intake' && <Intake onOpenProject={open} />}
        {tab === 'status' && project && <StatusReport project={project} />}
        {tab === 'committee' && <Committee onOpen={open} />}
      </main>
    </div>
  );
}
