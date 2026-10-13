import React from 'react';
import { useStore } from '../store.jsx';
import { budgetStats, scheduleStats, rag, deviations, fmtMoney, fmtDate, payback, TODAY } from '../metrics.js';
import { Card, Rag } from './ui.jsx';

// Материалы к проектному / инвестиционному комитету:
// 1) решения по проектам с отклонениями, 2) защита новых инициатив, 3) сводка портфеля
export default function Committee({ onOpen }) {
  const { state } = useStore();

  const escalations = state.projects
    .map((p) => ({ p, r: rag(p), b: budgetStats(p), s: scheduleStats(p), dev: deviations(p) }))
    .filter((x) => x.r.overall !== 'green');

  const newOnes = state.initiatives.filter((i) => i.stage === 'committee');
  const totalExtra = escalations.reduce((s, x) => s + Math.max(0, x.b.variance), 0);

  return (
    <div className="stack committee">
      <div className="row-between no-print">
        <p className="muted">Пакет материалов собирается из текущих данных портфеля на {fmtDate(TODAY)}.</p>
        <button onClick={() => window.print()}>Печать / PDF</button>
      </div>

      <Card title="1. Сводка портфеля">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Проект</th><th>Фаза</th><th>Статус</th><th>Бюджет план → прогноз</th><th>Срок план → прогноз</th></tr></thead>
            <tbody>
              {state.projects.map((p) => {
                const b = budgetStats(p);
                return (
                  <tr key={p.id} className="clickable" onClick={() => onOpen(p.id)}>
                    <td><span className="code">{p.code}</span> {p.name}</td>
                    <td>{p.phase}</td>
                    <td><Rag value={rag(p).overall} /></td>
                    <td>{fmtMoney(b.plan)} → {fmtMoney(b.forecast)}</td>
                    <td>{fmtDate(p.planEnd)} → {fmtDate(p.forecastEnd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`2. Вопросы на решение по действующим проектам (${escalations.length})`}>
        {escalations.length === 0 && <p className="ok">Эскалаций нет — все проекты в плане.</p>}
        {escalations.map(({ p, r, b, s, dev }) => (
          <article key={p.id} className="decision">
            <header className="row-between">
              <h4>{p.code} · {p.name}</h4>
              <Rag value={r.overall} />
            </header>
            <div className="grid-2">
              <div>
                <h5>Ситуация</h5>
                <ul>{dev.map((d, i) => <li key={i}>{d.text}</li>)}</ul>
                <h5>Причины / риски</h5>
                <ul>{p.risks.map((k) => <li key={k.id}>{k.text}</li>)}</ul>
              </div>
              <div>
                <h5>Предлагаемые меры</h5>
                <ul>{p.actions.filter((a) => a.status === 'open').map((a) => <li key={a.id}>{a.text} ({a.owner}, до {fmtDate(a.due)})</li>)}</ul>
                <h5>Запрашиваемое решение</h5>
                <ul className="ask">
                  {b.variance > 0 && <li>Увеличить бюджет на <b>{fmtMoney(b.variance)}</b> (до {fmtMoney(b.forecast)})</li>}
                  {s.slip > 0 && <li>Перенести срок окончания на <b>{fmtDate(p.forecastEnd)}</b> (+{s.slip} дн.)</li>}
                  {b.variance <= 0 && s.slip <= 0 && <li>Принять к сведению, решений не требуется</li>}
                </ul>
              </div>
            </div>
          </article>
        ))}
        {totalExtra > 0 && <p className="total-line">Итого дополнительное финансирование: <b>{fmtMoney(totalExtra)}</b></p>}
      </Card>

      <Card title={`3. Защита новых инициатив (${newOnes.length})`}>
        {newOnes.length === 0 && <p className="muted">Нет инициатив на стадии комитета. Переведите инициативу на этап «На комитете» во вкладке «Инициативы».</p>}
        {newOnes.map((i) => (
          <article key={i.id} className="decision">
            <h4>{i.title}</h4>
            <div className="grid-2">
              <dl className="dl">
                <dt>Проблема</dt><dd>{i.request}</dd>
                <dt>Цель</dt><dd>{i.goal}</dd>
                <dt>KPI</dt><dd>{i.kpis}</dd>
                <dt>Рамки</dt><dd>{i.scope}<br /><span className="muted">Вне рамок: {i.outOfScope}</span></dd>
              </dl>
              <dl className="dl">
                <dt>Заказчик / спонсор</dt><dd>{i.customer} / {i.sponsor}</dd>
                <dt>CAPEX / OPEX в год</dt><dd>{fmtMoney(i.capex)} / {fmtMoney(i.opex)}</dd>
                <dt>Эффект в год</dt><dd>{fmtMoney(i.effect)}</dd>
                <dt>Окупаемость</dt><dd><b>{Number.isFinite(payback(i)) ? `${payback(i).toFixed(1)} г.` : '—'}</b></dd>
                <dt>Целевой срок</dt><dd>{fmtDate(i.targetDate)}</dd>
              </dl>
            </div>
            <p className="ask">Запрашиваемое решение: одобрить запуск проекта с бюджетом {fmtMoney(Number(i.capex) + Number(i.opex))}.</p>
          </article>
        ))}
      </Card>
    </div>
  );
}
