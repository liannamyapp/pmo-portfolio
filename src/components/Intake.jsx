import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { INITIATIVE_STAGES } from '../data.js';
import { fmtMoney, fmtDate, payback, TODAY } from '../metrics.js';
import { Card, Field } from './ui.jsx';

const EMPTY = {
  title: '', request: '', customer: '', sponsor: '', format: 'Кроссформат',
  goal: '', kpis: '', scope: '', outOfScope: '', capex: '', opex: '', effect: '', targetDate: '',
};

// Чек-лист валидации: бизнес-запрос → формализованная проектная инициатива
const CHECKS = [
  { key: 'title', label: 'Название инициативы', test: (f) => f.title.trim().length >= 5 },
  { key: 'customer', label: 'Определён бизнес-заказчик', test: (f) => !!f.customer.trim() },
  { key: 'sponsor', label: 'Определён спонсор', test: (f) => !!f.sponsor.trim() },
  { key: 'goal', label: 'Цель сформулирована', test: (f) => f.goal.trim().length >= 10 },
  { key: 'kpis', label: 'Измеримые KPI (есть числа)', test: (f) => /\d/.test(f.kpis) },
  { key: 'scope', label: 'Границы: что входит', test: (f) => !!f.scope.trim() },
  { key: 'outOfScope', label: 'Границы: что не входит', test: (f) => !!f.outOfScope.trim() },
  { key: 'capex', label: 'Оценка CAPEX', test: (f) => Number(f.capex) > 0 },
  { key: 'effect', label: 'Ожидаемый эффект в год', test: (f) => Number(f.effect) > 0 },
  { key: 'targetDate', label: 'Целевой срок в будущем', test: (f) => !!f.targetDate && f.targetDate > TODAY },
];

const NEXT = { draft: 'validation', validation: 'committee', committee: 'approved' };

export default function Intake({ onOpenProject }) {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [tried, setTried] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const results = CHECKS.map((c) => ({ ...c, ok: c.test(form) }));
  const ready = results.every((c) => c.ok);
  const err = (k) => tried && !results.find((c) => c.key === k)?.ok ? 'Заполните корректно' : null;

  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (!ready) return;
    dispatch({
      type: 'initiative/add',
      item: { ...form, capex: Number(form.capex), opex: Number(form.opex || 0), effect: Number(form.effect), stage: 'validation' },
    });
    setForm(EMPTY);
    setTried(false);
  };

  return (
    <div className="stack">
      <Card title="Воронка инициатив">
        <div className="kanban">
          {INITIATIVE_STAGES.map((st) => {
            const items = state.initiatives.filter((i) => i.stage === st.key);
            return (
              <div key={st.key} className="column">
                <h4>{st.label} <span className="muted">{items.length}</span></h4>
                {items.map((i) => (
                  <InitiativeCard key={i.id} i={i} dispatch={dispatch} onOpenProject={onOpenProject} />
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid-2 wide-left">
        <Card title="Формализация бизнес-запроса">
          <form className="form" onSubmit={submit}>
            <Field label="Исходный запрос бизнеса (как сформулировал заказчик)">
              <textarea rows={2} value={form.request} onChange={set('request')} placeholder="«Хотим, чтобы…»" />
            </Field>
            <Field label="Название инициативы" error={err('title')}><input value={form.title} onChange={set('title')} /></Field>
            <div className="grid-3">
              <Field label="Бизнес-заказчик" error={err('customer')}><input value={form.customer} onChange={set('customer')} /></Field>
              <Field label="Спонсор" error={err('sponsor')}><input value={form.sponsor} onChange={set('sponsor')} /></Field>
              <Field label="Формат">
                <select value={form.format} onChange={set('format')}>
                  {['Кроссформат', 'Гипермаркеты', 'Супермаркеты', 'Онлайн', 'РЦ', 'Офис'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Цель (какую бизнес-проблему решаем)" error={err('goal')}><textarea rows={2} value={form.goal} onChange={set('goal')} /></Field>
            <Field label="KPI / измеримый результат" error={err('kpis')}><input value={form.kpis} onChange={set('kpis')} placeholder="напр. −15% списаний" /></Field>
            <div className="grid-2">
              <Field label="Входит в рамки" error={err('scope')}><textarea rows={2} value={form.scope} onChange={set('scope')} /></Field>
              <Field label="Не входит в рамки" error={err('outOfScope')}><textarea rows={2} value={form.outOfScope} onChange={set('outOfScope')} /></Field>
            </div>
            <div className="grid-4">
              <Field label="CAPEX, млн ₽" error={err('capex')}><input type="number" value={form.capex} onChange={set('capex')} /></Field>
              <Field label="OPEX/год, млн ₽"><input type="number" value={form.opex} onChange={set('opex')} /></Field>
              <Field label="Эффект/год, млн ₽" error={err('effect')}><input type="number" value={form.effect} onChange={set('effect')} /></Field>
              <Field label="Целевой срок" error={err('targetDate')}><input type="date" value={form.targetDate} onChange={set('targetDate')} /></Field>
            </div>
            <button type="submit" disabled={tried && !ready}>Отправить на валидацию</button>
          </form>
        </Card>

        <Card title={`Готовность инициативы: ${results.filter((c) => c.ok).length}/${results.length}`}>
          <ul className="checklist">
            {results.map((c) => <li key={c.key} className={c.ok ? 'ok' : ''}>{c.ok ? '✓' : '○'} {c.label}</li>)}
          </ul>
          {Number(form.capex) > 0 && Number(form.effect) > 0 && (
            <p className="muted">Простая окупаемость: <b>{fmtPayback(payback(form))}</b></p>
          )}
        </Card>
      </div>
    </div>
  );
}

const fmtPayback = (y) => (Number.isFinite(y) && y > 0 ? `${y.toFixed(1)} г.` : 'не окупается');

function InitiativeCard({ i, dispatch, onOpenProject }) {
  return (
    <div className="mini-card">
      <strong>{i.title}</strong>
      <div className="muted">{i.customer}</div>
      <div className="muted">CAPEX {fmtMoney(i.capex)} · окуп. {fmtPayback(payback(i))}</div>
      <div className="muted">Срок: {fmtDate(i.targetDate)}</div>
      <div className="row gap">
        {NEXT[i.stage] && (
          <button className="small" onClick={() => dispatch({ type: 'initiative/stage', iid: i.id, stage: NEXT[i.stage] })}>
            {i.stage === 'committee' ? 'Одобрить' : 'Далее →'}
          </button>
        )}
        {['validation', 'committee'].includes(i.stage) && (
          <button className="small ghost" onClick={() => dispatch({ type: 'initiative/stage', iid: i.id, stage: 'rejected' })}>Отклонить</button>
        )}
        {i.stage === 'approved' && (
          <button className="small" onClick={() => dispatch({ type: 'initiative/launch', iid: i.id, today: TODAY })}>Запустить проект</button>
        )}
        {i.stage === 'launched' && i.projectId && (
          <button className="small ghost" onClick={() => onOpenProject(i.projectId)}>Открыть проект</button>
        )}
      </div>
    </div>
  );
}
