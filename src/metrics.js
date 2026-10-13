// Расчёт показателей проекта: бюджет, сроки, RAG-статус, отклонения

export const TODAY = new Date().toISOString().slice(0, 10);

const DAY = 86400000;
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export const fmtMoney = (n) => `${Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ₽`;

const sum = (arr, k) => arr.reduce((s, x) => s + Number(x[k] || 0), 0);

// Пороги отклонений (можно вынести в настройки PMO)
export const THRESHOLDS = {
  budget: { amber: 5, red: 10 }, // % превышения прогноза над планом
  schedule: { amber: 14, red: 30 }, // дней сдвига прогноза окончания
};

export function budgetStats(p) {
  const plan = sum(p.budget, 'plan');
  const fact = sum(p.budget, 'fact');
  const forecast = sum(p.budget, 'forecast');
  const variance = forecast - plan;
  const variancePct = plan ? (variance / plan) * 100 : 0;
  return { plan, fact, forecast, variance, variancePct, burnPct: plan ? (fact / plan) * 100 : 0 };
}

export function scheduleStats(p) {
  const slip = daysBetween(p.planEnd, p.forecastEnd);
  const total = Math.max(1, daysBetween(p.start, p.planEnd));
  const elapsedPct = Math.min(100, Math.max(0, (daysBetween(p.start, TODAY) / total) * 100));
  const done = p.milestones.filter((m) => m.done).length;
  const overdue = p.milestones.filter((m) => !m.done && m.plan < TODAY);
  const slipped = p.milestones.filter((m) => !m.done && m.forecast > m.plan);
  const next = p.milestones.filter((m) => !m.done).sort((a, b) => a.forecast.localeCompare(b.forecast))[0];
  return { slip, elapsedPct, done, total: p.milestones.length, overdue, slipped, next };
}

const level = (value, t) => (value >= t.red ? 'red' : value >= t.amber ? 'amber' : 'green');
const worst = (...ls) => (ls.includes('red') ? 'red' : ls.includes('amber') ? 'amber' : 'green');

export function rag(p) {
  const b = budgetStats(p);
  const s = scheduleStats(p);
  const budget = level(b.variancePct, THRESHOLDS.budget);
  const schedule = level(s.slip, THRESHOLDS.schedule);
  const highRisks = p.risks.filter((r) => r.prob === 'Высокая' && r.impact === 'Высокое').length;
  const risk = highRisks > 1 ? 'red' : highRisks === 1 ? 'amber' : 'green';
  return { budget, schedule, risk, overall: worst(budget, schedule, risk) };
}

// Отклонения, требующие корректирующих действий
export function deviations(p) {
  const out = [];
  const b = budgetStats(p);
  const s = scheduleStats(p);
  if (b.variancePct >= THRESHOLDS.budget.amber)
    out.push({ kind: 'Бюджет', text: `Прогноз превышает план на ${fmtMoney(b.variance)} (+${b.variancePct.toFixed(1)}%)` });
  if (s.slip >= THRESHOLDS.schedule.amber)
    out.push({ kind: 'Сроки', text: `Прогноз окончания сдвинут на ${s.slip} дн. (${fmtDate(p.forecastEnd)})` });
  s.overdue.forEach((m) => out.push({ kind: 'Контрольная точка', text: `Просрочена: «${m.name}» (план ${fmtDate(m.plan)})` }));
  s.slipped
    .filter((m) => !s.overdue.includes(m))
    .forEach((m) => out.push({ kind: 'Контрольная точка', text: `Сдвиг «${m.name}» на ${daysBetween(m.plan, m.forecast)} дн.` }));
  p.budget
    .filter((x) => x.plan && ((x.forecast - x.plan) / x.plan) * 100 >= THRESHOLDS.budget.red)
    .forEach((x) => out.push({ kind: 'Статья бюджета', text: `«${x.item}»: +${fmtMoney(x.forecast - x.plan)}` }));
  return out;
}

export const RAG_LABEL = { green: 'В плане', amber: 'Риск', red: 'Критично' };

// Простая окупаемость инициативы (лет)
export const payback = (i) => (i.effect > 0 ? (Number(i.capex) / (Number(i.effect) - Number(i.opex || 0))) : Infinity);
