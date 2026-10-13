import React from 'react';
import { RAG_LABEL } from '../metrics.js';

export const Rag = ({ value, label }) => (
  <span className={`rag rag-${value}`}>
    <i />
    {label ?? RAG_LABEL[value]}
  </span>
);

export const Bar = ({ value, marker, tone = 'accent' }) => (
  <div className="bar">
    <div className={`bar-fill tone-${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
    {marker != null && <div className="bar-marker" style={{ left: `${Math.min(100, marker)}%` }} />}
  </div>
);

export const Kpi = ({ label, value, hint, tone }) => (
  <div className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
    {hint && <div className="kpi-hint">{hint}</div>}
  </div>
);

export const Card = ({ title, actions, children, className = '' }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <header className="card-head">
        <h3>{title}</h3>
        <div>{actions}</div>
      </header>
    )}
    {children}
  </section>
);

export const Field = ({ label, children, error }) => (
  <label className={`field ${error ? 'has-error' : ''}`}>
    <span>{label}</span>
    {children}
    {error && <em>{error}</em>}
  </label>
);
