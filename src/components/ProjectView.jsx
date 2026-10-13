import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { PHASES } from '../data.js';
import { budgetStats, scheduleStats, rag, deviations, fmtMoney, fmtDate, daysBetween, TODAY } from '../metrics.js';
import { Rag, Bar, Kpi, Card, Field } from './ui.jsx';

export default function ProjectView({ project: p }) {
  const { dispatch } = useStore();
  const b = budgetStats(p);
  const s = scheduleStats(p);
  const r = rag(p);
  const dev = deviations(p);
  const upd = (patch) => dispatch({ type: 'project/update', id: p.id, patch });

  return (
    <div className="stack">
      <Card className="hero">
        <div className="row-between wrap">
          <div>
            <div className="code">{p.code} · {p.format} · старт {fmtDate(p.start)}</div>
            <h2>{p.name}</h2>
            <p className="muted">Спонсор: {p.sponsor} · Заказчик: {p.customer}</p>
          </div>
          <Rag value={r.overall} />
        </div>
        <ol className="phases">
          {PHASES.map((ph, i) => {
            const cur = PHASES.indexOf(p.phase);
            return (
              <li key={ph} className={i < cur ? 'past' : i === cur ? 'current' : ''} onClick={() => upd({ phase: ph })}>
                <span>{i + 1}</span>
                {ph}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="kpis">
        <Kpi label="Бюджет: план" value={fmtMoney(b.plan)} hint={`Факт ${fmtMoney(b.fact)} (${b.burnPct.toFixed(0)}%)`} />
        <Kpi
          label="Бюджет: прогноз"
          value={fmtMoney(b.forecast)}
          hint={`${b.variance >= 0 ? '+' : ''}${fmtMoney(b.variance)} к плану`}
          tone={r.budget}
        />
        <Kpi label="Окончание: план" value={fmtDate(p.planEnd)} hint={`Прошло ${s.elapsedPct.toFixed(0)}% срока`} />
        <Kpi
          label="Окончание: прогноз"
          value={fmtDate(p.forecastEnd)}
          hint={s.slip > 0 ? `+${s.slip} дн.` : 'без сдвига'}
          tone={r.schedule}
        />
      </div>

      <div className="grid-2">
        <Card title="Паспорт проекта">
          <dl className="dl">
            <dt>Цель</dt><dd>{p.goal}</dd>
            <dt>KPI / эффект</dt><dd>{p.kpis}</dd>
            <dt>Прогноз окончания</dt>
            <dd><input type="date" value={p.forecastEnd} onChange={(e) => upd({ forecastEnd: e.target.value })} /></dd>
          </dl>
          <h4>Участники</h4>
          <ul className="chips">
            {p.stakeholders.map((x, i) => <li key={i}><b>{x.role}:</b> {x.name}</li>)}
          </ul>
        </Card>

        <Card title="Отклонения и корректирующие действия">
          {dev.length === 0 ? (
            <p className="ok">Отклонений сверх порогов нет</p>
          ) : (
            <ul className="list">
              {dev.map((d, i) => (
                <li key={i}><span className="pill red">{d.kind}</span> {d.text}</li>
              ))}
            </ul>
          )}
          <Actions p={p} />
        </Card>
      </div>

      <Card title={`Контрольные точки (${s.done}/${s.total})`}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th></th><th>Контрольная точка</th><th>План</th><th>Прогноз</th><th>Факт</th><th>Отклонение</th></tr>
            </thead>
            <tbody>
              {p.milestones.map((m) => {
                const d = daysBetween(m.plan, m.done ? m.actual : m.forecast);
                const overdue = !m.done && m.plan < TODAY;
                return (
                  <tr key={m.id} className={overdue ? 'row-red' : ''}>
                    <td>
                      <input type="checkbox" checked={m.done}
                        onChange={() => dispatch({ type: 'milestone/toggle', id: p.id, mid: m.id, today: TODAY })} />
                    </td>
                    <td>{m.name}{overdue && <span className="pill red">просрочена</span>}</td>
                    <td>{fmtDate(m.plan)}</td>
                    <td>
                      {m.done ? '—' : (
                        <input type="date" value={m.forecast}
                          onChange={(e) => dispatch({ type: 'milestone/forecast', id: p.id, mid: m.id, date: e.target.value })} />
                      )}
                    </td>
                    <td>{fmtDate(m.actual)}</td>
                    <td className={d > 0 ? 'warn' : 'ok'}>{d > 0 ? `+${d} дн.` : d < 0 ? `${d} дн.` : '0'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Бюджет проекта (млн ₽)">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Статья</th><th>План</th><th>Факт</th><th>Прогноз (EAC)</th><th>Отклонение</th><th>Освоение</th></tr>
            </thead>
            <tbody>
              {p.budget.map((x) => {
                const v = x.forecast - x.plan;
                return (
                  <tr key={x.id}>
                    <td>{x.item}</td>
                    <td>{x.plan}</td>
                    <td><NumInput value={x.fact} onChange={(fact) => dispatch({ type: 'budget/update', id: p.id, bid: x.id, patch: { fact } })} /></td>
                    <td><NumInput value={x.forecast} onChange={(forecast) => dispatch({ type: 'budget/update', id: p.id, bid: x.id, patch: { forecast } })} /></td>
                    <td className={v > 0 ? 'warn' : 'ok'}>{v > 0 ? '+' : ''}{v.toFixed(1)}</td>
                    <td style={{ minWidth: 120 }}><Bar value={x.plan ? (x.fact / x.plan) * 100 : 0} /></td>
                  </tr>
                );
              })}
              <tr className="total">
                <td>Итого</td><td>{b.plan}</td><td>{b.fact}</td><td>{b.forecast}</td>
                <td className={b.variance > 0 ? 'warn' : 'ok'}>{b.variance > 0 ? '+' : ''}{b.variance.toFixed(1)} ({b.variancePct.toFixed(1)}%)</td>
                <td><Bar value={b.burnPct} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Ресурсы: внутренние ИТ-команды и подрядчики">
          <ul className="list">
            {p.resources.map((x) => (
              <li key={x.id}>
                <div className="row-between">
                  <span><span className={`tag ${x.type}`}>{x.type === 'vendor' ? 'Подрядчик' : 'Внутр. ИТ'}</span> {x.team}</span>
                  <b>{x.load}%</b>
                </div>
                <div className="muted">Контакт: {x.contact}</div>
              </li>
            ))}
            {p.resources.length === 0 && <li className="muted">Ресурсы ещё не согласованы</li>}
          </ul>
        </Card>
        <Card title="Риски">
          <ul className="list">
            {p.risks.map((k) => (
              <li key={k.id}>
                {k.text}
                <div className="muted">Вероятность: {k.prob} · Влияние: {k.impact} · Владелец: {k.owner}</div>
              </li>
            ))}
            {p.risks.length === 0 && <li className="muted">Значимых рисков нет</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function NumInput({ value, onChange }) {
  return (
    <input className="num" type="number" step="0.1" value={value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
  );
}

function Actions({ p }) {
  const { dispatch } = useStore();
  const [form, setForm] = useState({ text: '', owner: '', due: '' });
  const add = (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    dispatch({ type: 'action/add', id: p.id, action: form });
    setForm({ text: '', owner: '', due: '' });
  };
  return (
    <>
      <h4>План корректирующих действий</h4>
      <ul className="list">
        {p.actions.map((a) => (
          <li key={a.id} className={a.status === 'done' ? 'done' : ''}>
            <label className="row">
              <input type="checkbox" checked={a.status === 'done'}
                onChange={() => dispatch({ type: 'action/status', id: p.id, aid: a.id, status: a.status === 'done' ? 'open' : 'done' })} />
              <span>{a.text}</span>
            </label>
            <div className="muted">{a.owner || '—'} · до {fmtDate(a.due)}</div>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <Field label="Действие"><input value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Что сделать" /></Field>
        <Field label="Ответственный"><input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
        <Field label="Срок"><input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field>
        <button type="submit">Добавить</button>
      </form>
    </>
  );
}
