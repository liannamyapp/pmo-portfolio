import React, { useState } from 'react';
import { budgetStats, scheduleStats, rag, deviations, fmtMoney, fmtDate, RAG_LABEL, TODAY } from '../metrics.js';
import { Card, Rag } from './ui.jsx';

export function buildStatusText(p) {
  const b = budgetStats(p);
  const s = scheduleStats(p);
  const r = rag(p);
  const dev = deviations(p);
  const done = p.milestones.filter((m) => m.done);
  const upcoming = p.milestones.filter((m) => !m.done);
  const open = p.actions.filter((a) => a.status === 'open');

  return [
    `СТАТУС ПРОЕКТА ${p.code} · ${p.name}`,
    `Дата: ${fmtDate(TODAY)} · Фаза: ${p.phase}`,
    `Общий статус: ${RAG_LABEL[r.overall]} (сроки — ${RAG_LABEL[r.schedule]}, бюджет — ${RAG_LABEL[r.budget]}, риски — ${RAG_LABEL[r.risk]})`,
    '',
    'СРОКИ',
    `• Окончание: план ${fmtDate(p.planEnd)}, прогноз ${fmtDate(p.forecastEnd)}${s.slip > 0 ? ` (+${s.slip} дн.)` : ''}`,
    `• Контрольные точки: выполнено ${s.done} из ${s.total}`,
    ...done.slice(-2).map((m) => `  ✓ ${m.name} — ${fmtDate(m.actual)}`),
    ...upcoming.map((m) => `  ○ ${m.name} — план ${fmtDate(m.plan)}, прогноз ${fmtDate(m.forecast)}`),
    '',
    'БЮДЖЕТ',
    `• План ${fmtMoney(b.plan)} · Факт ${fmtMoney(b.fact)} (${b.burnPct.toFixed(0)}%) · Прогноз ${fmtMoney(b.forecast)}`,
    `• Отклонение прогноза: ${b.variance >= 0 ? '+' : ''}${fmtMoney(b.variance)} (${b.variancePct.toFixed(1)}%)`,
    '',
    'ОТКЛОНЕНИЯ',
    ...(dev.length ? dev.map((d) => `• [${d.kind}] ${d.text}`) : ['• Нет отклонений сверх порогов']),
    '',
    'КОРРЕКТИРУЮЩИЕ ДЕЙСТВИЯ',
    ...(open.length ? open.map((a) => `• ${a.text} — ${a.owner}, до ${fmtDate(a.due)}`) : ['• Не требуются']),
    '',
    'КЛЮЧЕВЫЕ РИСКИ',
    ...(p.risks.length ? p.risks.map((k) => `• ${k.text} (${k.prob}/${k.impact}) — ${k.owner}`) : ['• Нет значимых рисков']),
  ].join('\n');
}

export default function StatusReport({ project: p }) {
  const [copied, setCopied] = useState(false);
  const text = buildStatusText(p);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Card
      title={<>Статус-отчёт <Rag value={rag(p).overall} /></>}
      actions={
        <div className="row gap no-print">
          <button className="small" onClick={copy}>{copied ? 'Скопировано ✓' : 'Копировать'}</button>
          <button className="small ghost" onClick={() => window.print()}>Печать / PDF</button>
        </div>
      }
    >
      <p className="muted no-print">Формируется автоматически из контрольных точек, бюджета, рисков и плана действий — всегда актуален.</p>
      <pre className="report">{text}</pre>
    </Card>
  );
}
