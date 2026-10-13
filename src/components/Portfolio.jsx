import React, { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { budgetStats, scheduleStats, rag, deviations, fmtMoney, fmtDate } from '../metrics.js';
import { Rag, Bar, Kpi, Card } from './ui.jsx';

export default function Portfolio({ onOpen }) {
  const { state } = useStore();
  const rows = useMemo(
    () =>
      state.projects.map((p) => ({
        p,
        b: budgetStats(p),
        s: scheduleStats(p),
        r: rag(p),
        dev: deviations(p),
      })),
    [state.projects]
  );

  const totals = rows.reduce(
    (t, x) => ({ plan: t.plan + x.b.plan, fact: t.fact + x.b.fact, forecast: t.forecast + x.b.forecast }),
    { plan: 0, fact: 0, forecast: 0 }
  );
  const byRag = (v) => rows.filter((x) => x.r.overall === v).length;
  const openActions = state.projects.flatMap((p) => p.actions.filter((a) => a.status === 'open'));
  const vendors = new Set(state.projects.flatMap((p) => p.resources.filter((r) => r.type === 'vendor').map((r) => r.team)));
  const devPct = totals.plan ? ((totals.forecast - totals.plan) / totals.plan) * 100 : 0;

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Проектов в портфеле" value={rows.length} hint={`🟢 ${byRag('green')} · 🟡 ${byRag('amber')} · 🔴 ${byRag('red')}`} />
        <Kpi label="Бюджет (план)" value={fmtMoney(totals.plan)} hint={`Освоено ${fmtMoney(totals.fact)}`} />
        <Kpi
          label="Прогноз бюджета"
          value={fmtMoney(totals.forecast)}
          hint={`${devPct >= 0 ? '+' : ''}${devPct.toFixed(1)}% к плану`}
          tone={devPct >= 10 ? 'red' : devPct >= 5 ? 'amber' : 'green'}
        />
        <Kpi label="Открытых корр. действий" value={openActions.length} hint={`Подрядчиков: ${vendors.size}`} />
      </div>

      <Card title="Проекты портфеля">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Проект</th>
                <th>Фаза</th>
                <th>Статус</th>
                <th>Сроки</th>
                <th>Бюджет: план / прогноз</th>
                <th>Контрольные точки</th>
                <th>Отклонения</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, b, s, r, dev }) => (
                <tr key={p.id} onClick={() => onOpen(p.id)} className="clickable">
                  <td>
                    <div className="code">{p.code} · {p.format}</div>
                    <strong>{p.name}</strong>
                    <div className="muted">{p.customer}</div>
                  </td>
                  <td><span className="phase">{p.phase}</span></td>
                  <td>
                    <Rag value={r.overall} />
                    <div className="rag-mini">
                      <Rag value={r.schedule} label="С" />
                      <Rag value={r.budget} label="Б" />
                      <Rag value={r.risk} label="Р" />
                    </div>
                  </td>
                  <td>
                    <div>{fmtDate(p.planEnd)}</div>
                    {s.slip > 0 && <div className="warn">→ {fmtDate(p.forecastEnd)} (+{s.slip} дн.)</div>}
                    <Bar value={s.elapsedPct} />
                  </td>
                  <td>
                    <div>{fmtMoney(b.plan)} / <b className={b.variancePct >= 5 ? 'warn' : ''}>{fmtMoney(b.forecast)}</b></div>
                    <Bar value={b.burnPct} marker={(b.forecast / b.plan) * 100} tone={b.variancePct >= 10 ? 'red' : 'accent'} />
                    <div className="muted">освоено {b.burnPct.toFixed(0)}%</div>
                  </td>
                  <td>
                    {s.done}/{s.total}
                    {s.next && <div className="muted">Далее: {s.next.name} — {fmtDate(s.next.forecast)}</div>}
                  </td>
                  <td>{dev.length ? <span className="pill red">{dev.length}</span> : <span className="pill green">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted legend">С — сроки, Б — бюджет, Р — риски. Пороги: бюджет +5% / +10%, сроки +14 / +30 дней.</p>
      </Card>

      <div className="grid-2">
        <Card title="Загрузка ресурсов (без собственной команды разработки)">
          <ResourceMatrix projects={state.projects} />
        </Card>
        <Card title="Открытые корректирующие действия">
          {openActions.length === 0 && <p className="muted">Нет открытых действий</p>}
          <ul className="list">
            {state.projects.flatMap((p) =>
              p.actions
                .filter((a) => a.status === 'open')
                .map((a) => (
                  <li key={a.id} onClick={() => onOpen(p.id)} className="clickable">
                    <span className="code">{p.code}</span> {a.text}
                    <div className="muted">{a.owner} · до {fmtDate(a.due)}</div>
                  </li>
                ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ResourceMatrix({ projects }) {
  const teams = {};
  projects.forEach((p) =>
    p.resources.forEach((r) => {
      teams[r.team] ??= { type: r.type, total: 0, items: [] };
      teams[r.team].total += r.load;
      teams[r.team].items.push(`${p.code}: ${r.load}%`);
    })
  );
  return (
    <ul className="list">
      {Object.entries(teams)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([team, t]) => (
          <li key={team}>
            <div className="row-between">
              <span>
                <span className={`tag ${t.type}`}>{t.type === 'vendor' ? 'Подрядчик' : 'Внутр. ИТ'}</span> {team}
              </span>
              <b className={t.total > 100 ? 'warn' : ''}>{t.total}%</b>
            </div>
            <Bar value={t.total} tone={t.total > 100 ? 'red' : 'accent'} />
            <div className="muted">{t.items.join(' · ')}</div>
          </li>
        ))}
    </ul>
  );
}
