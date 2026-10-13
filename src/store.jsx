import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { seedProjects, seedInitiatives } from './data.js';

const StoreCtx = createContext(null);
const KEY = 'pmo-portfolio-v1';

const initial = { projects: seedProjects, initiatives: seedInitiatives };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : initial;
  } catch {
    return initial;
  }
}

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function updateProject(state, id, fn) {
  return { ...state, projects: state.projects.map((p) => (p.id === id ? fn(p) : p)) };
}

function reducer(state, a) {
  switch (a.type) {
    case 'reset':
      return initial;

    case 'project/update':
      return updateProject(state, a.id, (p) => ({ ...p, ...a.patch }));

    case 'milestone/toggle':
      return updateProject(state, a.id, (p) => ({
        ...p,
        milestones: p.milestones.map((m) =>
          m.id === a.mid ? { ...m, done: !m.done, actual: !m.done ? a.today : null } : m
        ),
      }));

    case 'milestone/forecast':
      return updateProject(state, a.id, (p) => ({
        ...p,
        milestones: p.milestones.map((m) => (m.id === a.mid ? { ...m, forecast: a.date } : m)),
      }));

    case 'budget/update':
      return updateProject(state, a.id, (p) => ({
        ...p,
        budget: p.budget.map((b) => (b.id === a.bid ? { ...b, ...a.patch } : b)),
      }));

    case 'action/add':
      return updateProject(state, a.id, (p) => ({
        ...p,
        actions: [...p.actions, { id: uid('a'), status: 'open', ...a.action }],
      }));

    case 'action/status':
      return updateProject(state, a.id, (p) => ({
        ...p,
        actions: p.actions.map((x) => (x.id === a.aid ? { ...x, status: a.status } : x)),
      }));

    case 'initiative/add':
      return { ...state, initiatives: [{ id: uid('i'), stage: 'draft', ...a.item }, ...state.initiatives] };

    case 'initiative/stage':
      return {
        ...state,
        initiatives: state.initiatives.map((i) => (i.id === a.iid ? { ...i, stage: a.stage } : i)),
      };

    case 'initiative/launch': {
      const i = state.initiatives.find((x) => x.id === a.iid);
      const project = {
        id: uid('p'),
        code: `IT-${String(state.projects.length + 101)}`,
        name: i.title,
        sponsor: i.sponsor,
        customer: i.customer,
        format: i.format,
        phase: 'Инициация',
        start: a.today,
        planEnd: i.targetDate,
        forecastEnd: i.targetDate,
        goal: i.goal,
        kpis: i.kpis,
        milestones: [
          { id: uid('m'), name: 'Устав проекта утверждён', plan: a.today, forecast: a.today, done: false, actual: null },
          { id: uid('m'), name: 'Целевое решение (архитектура)', plan: i.targetDate, forecast: i.targetDate, done: false, actual: null },
        ],
        budget: [
          { id: uid('b'), item: 'CAPEX: разработка', plan: i.capex, fact: 0, forecast: i.capex },
          { id: uid('b'), item: 'OPEX: сопровождение (год 1)', plan: i.opex, fact: 0, forecast: i.opex },
        ],
        resources: [],
        risks: [],
        actions: [],
        stakeholders: [{ role: 'Бизнес-заказчик', name: i.customer }, { role: 'Спонсор', name: i.sponsor }],
      };
      return {
        projects: [...state.projects, project],
        initiatives: state.initiatives.map((x) => (x.id === a.iid ? { ...x, stage: 'launched', projectId: project.id } : x)),
      };
    }

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
