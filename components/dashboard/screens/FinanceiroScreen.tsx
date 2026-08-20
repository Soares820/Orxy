'use client';

import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, MONTH_NAMES, getLastNMonths } from '@/lib/utils';
import { exportToExcel, exportToCSV, parseFile, mapDespesa, mapPagamento } from '@/lib/xlsx-utils';
import type { Pagamento, Contrato, Despesa } from '@/lib/types';

type TabType = 'pagamentos' | 'contratos' | 'despesas' | 'dre' | 'bi';

const CAT_LABELS: Record<string, string> = {
  folha: 'Folha de pagamento',
  supervisao: 'Supervisao clinica',
  aluguel: 'Aluguel / IPTU',
  material: 'Material terapeutico',
  equipamentos: 'Equipamentos',
  marketing: 'Marketing / captacao',
  formacao: 'Formacao / cursos',
  adm: 'Administrativo',
  ti: 'TI / software',
  outros: 'Outros',
};
const CAT_COLORS: Record<string, string> = {
  folha: '#8b5cf6',
  supervisao: '#06b6d4',
  aluguel: '#f59e0b',
  material: '#10b981',
  equipamentos: '#3b82f6',
  marketing: '#f97316',
  formacao: '#a855f7',
  adm: '#ec4899',
  ti: '#64748b',
  outros: '#6b7280',
};
// short labels for charts
const CAT_SHORT: Record<string, string> = {
  folha: 'Folha',
  supervisao: 'Supervisao',
  aluguel: 'Aluguel',
  material: 'Material',
  equipamentos: 'Equip.',
  marketing: 'Marketing',
  formacao: 'Formacao',
  adm: 'Adm',
  ti: 'TI',
  outros: 'Outros',
};

// ─── SVG Sparkline ───────────────────────────────────────
function Sparkline({ values, color, height = 44 }: { values: number[]; color: string; height?: number }) {
  const W = 120; const H = height;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const xs = values.map((_, i) => (i / (values.length - 1)) * W);
  const ys = values.map((v) => H - ((v - min) / (max - min)) * (H * 0.8) - H * 0.1);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const area = `M${xs[0]},${H} ` + xs.map((x, i) => `L${x},${ys[i]}`).join(' ') + ` L${xs[xs.length - 1]},${H} Z`;
  const uid = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
    </svg>
  );
}

// ─── SVG Donut Chart ─────────────────────────────────────
function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 38; const cx = 50; const cy = 50; const stroke = 16;
  let offset = 0;
  const circ = 2 * Math.PI * R;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const dash = pct * circ;
    const arc = { ...seg, pct, dash, offset };
    offset += dash;
    return arc;
  });
  return (
    <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, flexShrink: 0 }}>
      {arcs.map((a, i) => (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={a.color} strokeWidth={stroke}
          strokeDasharray={`${a.dash} ${circ - a.dash}`} strokeDashoffset={-a.offset + circ / 4}
          style={{ transition: 'stroke-dasharray .5s' }} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--t1)" fontSize="14" fontWeight="800" fontFamily="inherit">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--t3)" fontSize="7" fontFamily="inherit">cobranças</text>
    </svg>
  );
}

// ─── SVG Bar Chart ───────────────────────────────────────
function BarChart({ months, payments, expenses }: {
  months: string[];
  payments: { mes: string; status: string; valor_recebido: number; valor_previsto: number }[];
  expenses: { mes: string; status: string; valor: number }[];
}) {
  const W = 560; const H = 160; const pad = { t: 10, b: 28, l: 52, r: 12 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const groupW = chartW / months.length;
  const barW = Math.min(groupW * 0.28, 22);
  const gap = barW * 0.4;

  const series = months.map((m) => ({
    label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3),
    previsto: payments.filter((p) => p.mes === m).reduce((s, p) => s + (p.valor_previsto ?? 0), 0),
    receita: payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0),
    despesa: expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0),
  }));

  const maxVal = Math.max(...series.flatMap((s) => [s.previsto, s.despesa]), 1);
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxVal / ticks) * i));

  const y = (v: number) => pad.t + chartH - (v / maxVal) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* grid lines */}
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--bdr)" strokeWidth="1" strokeDasharray="3,3" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fill="var(--t3)" fontSize="9" fontFamily="inherit">
            {v >= 1000 ? `${Math.round(v / 1000)}k` : v > 0 ? String(v) : '0'}
          </text>
        </g>
      ))}
      {/* bars */}
      {series.map((s, i) => {
        const cx = pad.l + i * groupW + groupW / 2;
        const b1x = cx - barW - gap / 2;
        const b2x = cx - gap / 2;
        const b3x = cx + gap / 2;
        const bh1 = (s.previsto / maxVal) * chartH;
        const bh2 = (s.receita / maxVal) * chartH;
        const bh3 = (s.despesa / maxVal) * chartH;
        return (
          <g key={s.label}>
            {/* previsto */}
            <rect x={b1x} y={y(s.previsto)} width={barW} height={Math.max(bh1, 2)} rx="3" fill="rgba(99,102,241,.25)" />
            {/* receita */}
            <rect x={b2x} y={y(s.receita)} width={barW} height={Math.max(bh2, 2)} rx="3" fill="#10b981" />
            {/* despesa */}
            <rect x={b3x} y={y(s.despesa)} width={barW} height={Math.max(bh3, 2)} rx="3" fill="#ef4444" opacity=".85" />
            <text x={cx} y={H - 6} textAnchor="middle" fill="var(--t3)" fontSize="10" fontFamily="inherit">{s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Line / Area chart ────────────────────────────────
function ResultadoChart({ months, payments, expenses }: {
  months: string[];
  payments: { mes: string; status: string; valor_recebido: number }[];
  expenses: { mes: string; status: string; valor: number }[];
}) {
  const W = 400; const H = 130; const pad = { t: 14, b: 26, l: 48, r: 12 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const pts = months.map((m) => {
    const rec = payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const desp = expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0);
    return { label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3), val: rec - desp };
  });

  const maxAbs = Math.max(...pts.map((p) => Math.abs(p.val)), 1);
  const mid = pad.t + chartH / 2;

  const coords = pts.map((p, i) => ({
    x: pad.l + (i / Math.max(pts.length - 1, 1)) * chartW,
    y: mid - (p.val / maxAbs) * (chartH / 2),
    val: p.val,
    label: p.label,
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const area = `M${coords[0].x},${mid} ` + coords.map((c) => `L${c.x},${c.y}`).join(' ') + ` L${coords[coords.length - 1].x},${mid} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="areaGradNeg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.01" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* zero line */}
      <line x1={pad.l} x2={W - pad.r} y1={mid} y2={mid} stroke="var(--bdr)" strokeWidth="1.5" />
      {/* tick labels y */}
      {[-1, 0, 1].map((t) => {
        const v = t * maxAbs;
        const yy = mid - (v / maxAbs) * (chartH / 2);
        return (
          <text key={t} x={pad.l - 5} y={yy + 4} textAnchor="end" fill="var(--t3)" fontSize="9" fontFamily="inherit">
            {v >= 1000 ? `${Math.round(v / 1000)}k` : v === 0 ? '0' : `${Math.round(v / 1000)}k`}
          </text>
        );
      })}
      {/* area */}
      <path d={area} fill="url(#areaGrad)" />
      {/* line */}
      <polyline points={polyline} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* dots */}
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="3.5" fill={c.val >= 0 ? '#10b981' : '#ef4444'} />
          <text x={c.x} y={H - 6} textAnchor="middle" fill="var(--t3)" fontSize="9" fontFamily="inherit">{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── BI Financeiro ────────────────────────────────────────
function BiFinanceiro() {
  const { state } = useApp();
  const { data } = state;
  const months6 = useMemo(() => getLastNMonths(6), []);
  const months12 = useMemo(() => getLastNMonths(12), []);

  // ── Faturamento ────────────────────────────────────────
  const faturamento = useMemo(() => {
    const previsto6 = data.payments.filter((p) => months6.includes(p.mes)).reduce((s, p) => s + (p.valor_previsto ?? 0), 0);
    const recebido6 = data.payments.filter((p) => months6.includes(p.mes) && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const inadimplente = data.payments.filter((p) => p.status === 'inadimplente').reduce((s, p) => s + (p.valor_previsto ?? 0), 0);
    const pendente = data.payments.filter((p) => p.status === 'pendente').reduce((s, p) => s + (p.valor_previsto ?? 0), 0);
    const taxaRecebimento = previsto6 > 0 ? Math.round((recebido6 / previsto6) * 100) : 0;
    const inadimplenteCount = data.payments.filter((p) => p.status === 'inadimplente').length;
    const totalPags = data.payments.length;
    const taxaInadimplencia = totalPags > 0 ? Math.round((inadimplenteCount / totalPags) * 100) : 0;

    // Convênio vs particular
    const porTipo: Record<string, number> = { particular: 0, convenio: 0 };
    data.contracts.forEach((c) => {
      const tipo = c.tipo === 'convenio' ? 'convenio' : 'particular';
      const rec = data.payments.filter((p) => p.contrato_id === c.id && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
      porTipo[tipo] = (porTipo[tipo] ?? 0) + rec;
    });

    return { previsto6, recebido6, inadimplente, pendente, taxaRecebimento, inadimplenteCount, taxaInadimplencia, porTipo };
  }, [data, months6]);

  // ── Por mês ────────────────────────────────────────────
  const porMes = useMemo(() => months6.map((m) => {
    const previsto = data.payments.filter((p) => p.mes === m).reduce((s, p) => s + (p.valor_previsto ?? 0), 0);
    const recebido = data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const despesas = data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0);
    return { label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3), previsto, recebido, despesas, resultado: recebido - despesas };
  }), [data, months6]);
  const maxMes = Math.max(...porMes.flatMap((m) => [m.previsto, m.despesas]), 1);

  // ── Inadimplentes ──────────────────────────────────────
  const inadimplentes = useMemo(() => {
    return data.payments
      .filter((p) => p.status === 'inadimplente' || p.status === 'pendente')
      .sort((a, b) => (b.valor_previsto ?? 0) - (a.valor_previsto ?? 0))
      .slice(0, 8)
      .map((p) => {
        const child = data.children.find((c) => c.id === p.child_id);
        return { ...p, childName: child?.name ?? `Paciente ${p.child_id}` };
      });
  }, [data]);

  // ── Ticket médio mensal ────────────────────────────────
  const ticketMedio = useMemo(() => {
    const recebidos = data.payments.filter((p) => p.status === 'recebido' || p.status === 'parcial');
    return recebidos.length > 0 ? recebidos.reduce((s, p) => s + (p.valor_recebido ?? 0), 0) / recebidos.length : 0;
  }, [data.payments]);

  // ── Despesas anual por categoria ───────────────────────
  const despPorCat = useMemo(() => {
    const map: Record<string, number> = {};
    data.expenses.filter((e) => months12.includes(e.mes) && e.status === 'pago').forEach((e) => {
      map[e.categoria] = (map[e.categoria] ?? 0) + e.valor;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.expenses, months12]);
  const maxCatAn = Math.max(...despPorCat.map((c) => c[1]), 1);

  const pctColor2 = (p: number) => p >= 80 ? '#10b981' : p >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 4 }}>

      {/* ── KPIs financeiros ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: 'Receita recebida (6m)', value: formatCurrency(faturamento.recebido6), color: '#10b981', sub: `de ${formatCurrency(faturamento.previsto6)} previsto` },
          { label: 'Taxa de recebimento', value: `${faturamento.taxaRecebimento}%`, color: pctColor2(faturamento.taxaRecebimento), sub: `${faturamento.inadimplenteCount} inadimplentes` },
          { label: 'Inadimplência', value: formatCurrency(faturamento.inadimplente), color: '#ef4444', sub: `${faturamento.taxaInadimplencia}% das cobranças` },
          { label: 'Em aberto', value: formatCurrency(faturamento.pendente), color: '#f59e0b', sub: 'aguardando pagamento' },
          { label: 'Ticket médio', value: formatCurrency(ticketMedio), color: 'var(--p)', sub: 'por cobrança recebida' },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '16px 14px', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 10, color: k.color, opacity: .7, fontWeight: 600, marginTop: 4 }}>{k.sub}</div>}
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 6 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Gráfico receita vs despesas por mês ── */}
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>Faturamento vs Despesas — 6 meses</div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[['rgba(99,102,241,.4)', 'Previsto'], ['#10b981', 'Recebido'], ['#ef4444', 'Despesas']].map(([c, l]) => (
              <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t3)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c as string }} />{l}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
          {porMes.map((m) => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: '85%' }}>
                <div style={{ flex: 1, background: 'rgba(99,102,241,.25)', borderRadius: '3px 3px 0 0', height: `${(m.previsto / maxMes) * 100}%`, minHeight: m.previsto > 0 ? 3 : 0 }} />
                <div style={{ flex: 1, background: '#10b981', borderRadius: '3px 3px 0 0', height: `${(m.recebido / maxMes) * 100}%`, minHeight: m.recebido > 0 ? 3 : 0 }} />
                <div style={{ flex: 1, background: '#ef4444', opacity: .8, borderRadius: '3px 3px 0 0', height: `${(m.despesas / maxMes) * 100}%`, minHeight: m.despesas > 0 ? 3 : 0 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: m.resultado >= 0 ? '#10b981' : '#ef4444' }}>
                {m.resultado >= 0 ? '+' : ''}{formatCurrency(m.resultado).replace('R$ ', '')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Convênio vs Particular + Inadimplentes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Convênio vs Particular */}
        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 16 }}>Repasse por origem</div>
          {faturamento.porTipo.particular === 0 && faturamento.porTipo.convenio === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>Sem dados de contratos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'particular', label: 'Particular', color: 'var(--p)', icon: '👤' },
                { key: 'convenio', label: 'Convênio / Plano', color: '#06b6d4', icon: '🏥' },
              ].map(({ key, label, color, icon }) => {
                const val = faturamento.porTipo[key] ?? 0;
                const total = faturamento.porTipo.particular + faturamento.porTipo.convenio;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
                        <span>{icon}</span>{label}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--t1)' }}>{formatCurrency(val)}</div>
                    </div>
                    <div style={{ height: 10, background: 'var(--sf2)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width .4s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 3 }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inadimplentes / Pendentes */}
        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>Em aberto / Inadimplentes</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,.1)', padding: '3px 10px', borderRadius: 20 }}>{inadimplentes.length} cobranças</div>
          </div>
          {inadimplentes.length === 0 ? (
            <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>✅</span> Todas as cobranças em dia
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {inadimplentes.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--sf2)', borderRadius: 8, border: `1px solid ${p.status === 'inadimplente' ? 'rgba(239,68,68,.2)' : 'var(--bdr)'}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.childName}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{p.mes}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: p.status === 'inadimplente' ? '#ef4444' : '#f59e0b', flexShrink: 0 }}>{formatCurrency(p.valor_previsto)}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: p.status === 'inadimplente' ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.15)', color: p.status === 'inadimplente' ? '#ef4444' : '#f59e0b', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {p.status === 'inadimplente' ? 'Inad.' : 'Pend.'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Despesas por categoria (12m) ── */}
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 16 }}>Despesas por categoria — 12 meses</div>
        {despPorCat.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>Sem despesas registradas</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {despPorCat.map(([cat, val]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: CAT_COLORS[cat as keyof typeof CAT_COLORS] ?? '#6b7280', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>{CAT_LABELS[cat] ?? cat}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{formatCurrency(val)}</div>
                  </div>
                  <div style={{ height: 6, background: 'var(--sf2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(val / maxCatAn) * 100}%`, background: CAT_COLORS[cat as keyof typeof CAT_COLORS] ?? '#6b7280', borderRadius: 3, transition: 'width .4s' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DRE Tab (Terapia Ocupacional / ABA / TEA) ───────────
function DreTab() {
  const { state } = useApp();
  const { data } = state;
  const months12 = useMemo(() => getLastNMonths(12), []);
  const [selectedMes, setSelectedMes] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState<'mensal' | 'anual'>('mensal');

  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = -11; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({ val: d.toISOString().slice(0, 7), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts.reverse();
  }, []);

  // Dados para visão mensal
  const mesDetail = useMemo(() => {
    const pags = data.payments.filter((p) => p.mes === selectedMes && (p.status === 'recebido' || p.status === 'parcial'));
    const desps = data.expenses.filter((e) => e.mes === selectedMes);
    const receitaTotal = pags.reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const despesaTotal = desps.filter((e) => e.status === 'pago').reduce((s, e) => s + e.valor, 0);
    const despesaPendente = desps.filter((e) => e.status === 'pendente').reduce((s, e) => s + e.valor, 0);
    const byCategory: Record<string, number> = {};
    desps.filter((e) => e.status === 'pago').forEach((e) => { byCategory[e.categoria] = (byCategory[e.categoria] ?? 0) + e.valor; });

    // Métricas TO específicas — sessions.data é 'YYYY-MM-DD', pegamos YYYY-MM
    const sessoesRealizadas = data.sessions.filter((s) => s.data?.slice(0, 7) === selectedMes && s.status === 'realizado').length;
    const sessoesAgendadas = data.sessions.filter((s) => s.data?.slice(0, 7) === selectedMes).length;
    const ticketMedio = pags.length > 0 ? receitaTotal / pags.length : 0;
    const receitaPorSessao = sessoesRealizadas > 0 ? receitaTotal / sessoesRealizadas : 0;
    const custoFixo = desps.filter((e) => e.status === 'pago' && ['folha', 'aluguel', 'supervisao', 'ti', 'adm'].includes(e.categoria)).reduce((s, e) => s + e.valor, 0);
    const custoVariavel = desps.filter((e) => e.status === 'pago' && !['folha', 'aluguel', 'supervisao', 'ti', 'adm'].includes(e.categoria)).reduce((s, e) => s + e.valor, 0);
    const ebitda = receitaTotal - despesaTotal;
    const margemBruta = receitaTotal > 0 ? Math.round((ebitda / receitaTotal) * 100) : 0;
    const pontoEquilibrio = receitaTotal > 0 && ebitda !== 0 ? Math.round(despesaTotal / (receitaTotal / Math.max(pags.length, 1))) : 0;

    return { receitaTotal, despesaTotal, despesaPendente, ebitda, margemBruta, byCategory, pags, desps, sessoesRealizadas, sessoesAgendadas, ticketMedio, receitaPorSessao, custoFixo, custoVariavel, pontoEquilibrio };
  }, [selectedMes, data]);

  // Dados para visão anual (12m)
  const anualData = useMemo(() => {
    const rec = months12.reduce((s, m) => s + data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((ss, p) => ss + (p.valor_recebido ?? 0), 0), 0);
    const desp = months12.reduce((s, m) => s + data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((ss, e) => ss + e.valor, 0), 0);
    const byCat: Record<string, number> = {};
    data.expenses.filter((e) => months12.includes(e.mes) && e.status === 'pago').forEach((e) => { byCat[e.categoria] = (byCat[e.categoria] ?? 0) + e.valor; });
    return { rec, desp, resultado: rec - desp, byCat, margem: rec > 0 ? Math.round(((rec - desp) / rec) * 100) : 0 };
  }, [months12, data]);

  const maxBar = Math.max(...months12.map((m) => {
    const r = data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const d = data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0);
    return Math.max(r, d);
  }), 1);

  const dreLinhas: { code: string; label: string; valor: number; style: 'receita' | 'deducao' | 'subtotal' | 'custoFixo' | 'custoVar' | 'resultado' | 'cat' }[] = [
    { code: '1', label: 'RECEITA BRUTA DE SERVICOS', valor: mesDetail.receitaTotal, style: 'receita' },
    { code: '1.1', label: 'Atendimentos particulares', valor: mesDetail.receitaTotal, style: 'cat' },
    { code: '2', label: 'DEDUCOES DA RECEITA', valor: 0, style: 'deducao' },
    { code: '2.1', label: 'Impostos sobre servicos (ISS ~5%)', valor: -(mesDetail.receitaTotal * 0.05), style: 'cat' },
    { code: '=', label: 'RECEITA LIQUIDA', valor: mesDetail.receitaTotal * 0.95, style: 'subtotal' },
    { code: '3', label: 'CUSTOS FIXOS', valor: -mesDetail.custoFixo, style: 'custoFixo' },
    ...(['folha', 'aluguel', 'supervisao', 'ti', 'adm']).filter((c) => (mesDetail.byCategory[c] ?? 0) > 0).map((c) => ({ code: `3.${c}`, label: CAT_LABELS[c] ?? c, valor: -(mesDetail.byCategory[c] ?? 0), style: 'cat' as const })),
    { code: '4', label: 'CUSTOS VARIAVEIS', valor: -mesDetail.custoVariavel, style: 'custoVar' },
    ...Object.entries(mesDetail.byCategory).filter(([c]) => !['folha', 'aluguel', 'supervisao', 'ti', 'adm'].includes(c)).map(([c, v]) => ({ code: `4.${c}`, label: CAT_LABELS[c] ?? c, valor: -v, style: 'cat' as const })),
    { code: '=', label: 'EBITDA (RESULTADO OPERACIONAL)', valor: mesDetail.ebitda, style: 'resultado' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header DRE */}
      <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.15),rgba(16,185,129,.1))', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Demonstracao do Resultado do Exercicio</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>Clinica de Terapia Ocupacional / ABA / TEA</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['mensal', 'anual'] as const).map((v) => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: '6px 14px', border: '1px solid', borderColor: viewMode === v ? 'var(--p)' : 'var(--bdr)', background: viewMode === v ? 'var(--ps)' : 'none', color: viewMode === v ? 'var(--p)' : 'var(--t2)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{v === 'mensal' ? 'Mensal' : 'Anual (12m)'}</button>
            ))}
          </div>
        </div>

        {/* mini gráfico barras 12m */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
          {months12.map((m) => {
            const r = data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
            const d = data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0);
            const label = MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3);
            const isSel = m === selectedMes;
            return (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }} onClick={() => { setSelectedMes(m); setViewMode('mensal'); }}>
                <div style={{ width: '100%', display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'flex-end', height: '76%' }}>
                  <div style={{ flex: 1, background: '#10b981', borderRadius: '2px 2px 0 0', height: `${Math.max((r / maxBar) * 100, r > 0 ? 4 : 0)}%`, opacity: isSel ? 1 : .55 }} />
                  <div style={{ flex: 1, background: '#ef4444', borderRadius: '2px 2px 0 0', height: `${Math.max((d / maxBar) * 100, d > 0 ? 4 : 0)}%`, opacity: isSel ? 1 : .55 }} />
                </div>
                <div style={{ fontSize: 8, color: isSel ? 'var(--p)' : 'var(--t3)', fontWeight: isSel ? 800 : 500 }}>{label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
          {[['#10b981', 'Receitas'], ['#ef4444', 'Despesas']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--t3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {viewMode === 'mensal' ? (
        <>
          {/* Seletor mês */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit' }}>
              {monthOptions.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>Clique no gráfico acima para navegar entre meses</div>
          </div>

          {/* KPIs TO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
            {[
              { label: 'Ticket medio', value: formatCurrency(mesDetail.ticketMedio), color: 'var(--p)', desc: 'por cobranca' },
              { label: 'Receita/sessao', value: formatCurrency(mesDetail.receitaPorSessao), color: '#10b981', desc: `${mesDetail.sessoesRealizadas} sessoes` },
              { label: 'Margem EBITDA', value: `${mesDetail.margemBruta}%`, color: mesDetail.margemBruta >= 20 ? '#10b981' : mesDetail.margemBruta >= 0 ? '#f59e0b' : '#ef4444', desc: 'resultado / receita' },
              { label: 'Custo fixo', value: formatCurrency(mesDetail.custoFixo), color: '#8b5cf6', desc: 'folha+aluguel+adm' },
              { label: 'Custo variavel', value: formatCurrency(mesDetail.custoVariavel), color: '#f97316', desc: 'material+formacao' },
            ].map((k) => (
              <div key={k.label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>{k.desc}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginTop: 5 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* DRE estruturada */}
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sf2)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.08em' }}>DRE — {monthOptions.find((o) => o.val === selectedMes)?.label ?? selectedMes}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Clinica TO/ABA/TEA</div>
            </div>
            {dreLinhas.map((l, i) => {
              const isSection = l.style !== 'cat';
              const isResult = l.style === 'resultado' || l.style === 'subtotal';
              const isCat = l.style === 'cat';
              const color = l.style === 'receita' ? '#10b981' : l.style === 'resultado' ? (l.valor >= 0 ? '#10b981' : '#ef4444') : l.style === 'subtotal' ? 'var(--p)' : l.style === 'deducao' ? '#ef4444' : l.style === 'custoFixo' ? '#8b5cf6' : l.style === 'custoVar' ? '#f97316' : 'var(--t2)';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${isResult ? 16 : isCat ? 8 : 12}px 20px ${isResult ? 16 : isCat ? 8 : 12}px ${isCat ? 36 : 20}px`, borderBottom: '1px solid var(--bdr)', background: isResult ? (l.valor >= 0 ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)') : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isCat && <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />}
                    <div>
                      <div style={{ fontSize: isCat ? 12 : 13, fontWeight: isSection ? 700 : 500, color, letterSpacing: isSection ? '.03em' : 0 }}>{l.label}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: isSection ? 800 : 600, fontSize: isResult ? 18 : 13, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {l.valor < 0 ? `(${formatCurrency(Math.abs(l.valor))})` : l.valor === 0 && !isResult ? '—' : formatCurrency(l.valor)}
                  </div>
                </div>
              );
            })}
            {mesDetail.despesaPendente > 0 && (
              <div style={{ padding: '10px 20px', background: 'rgba(245,158,11,.07)', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                Atenção: {formatCurrency(mesDetail.despesaPendente)} em despesas pendentes nao incluidas acima
              </div>
            )}
          </div>
        </>
      ) : (
        /* Visão anual */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Receita total 12m', value: formatCurrency(anualData.rec), color: '#10b981' },
              { label: 'Despesas 12m', value: formatCurrency(anualData.desp), color: '#ef4444' },
              { label: 'Resultado 12m', value: formatCurrency(anualData.resultado), color: anualData.resultado >= 0 ? '#10b981' : '#ef4444', sub: `Margem ${anualData.margem}%` },
            ].map((k) => (
              <div key={k.label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: k.color }}>{k.value}</div>
                {'sub' in k && k.sub && <div style={{ fontSize: 11, color: k.color, opacity: .7, marginTop: 3 }}>{k.sub}</div>}
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginTop: 8 }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)', marginBottom: 14 }}>Composicao das despesas — 12 meses</div>
            {Object.keys(anualData.byCat).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--t3)' }}>Nenhuma despesa registrada</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(anualData.byCat).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                  const pct = Math.round((val / anualData.desp) * 100);
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat] ?? '#6b7280' }} />
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>{CAT_LABELS[cat] ?? cat}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>{pct}%</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', minWidth: 90, textAlign: 'right' }}>{formatCurrency(val)}</div>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--sf2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[cat] ?? '#6b7280', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ paddingTop: 12, borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Total despesas</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#ef4444' }}>{formatCurrency(anualData.desp)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function FinanceiroScreen() {
  const { state, dispatch } = useApp();
  const { data } = state;

  const [tab, setTab] = useState<TabType>('pagamentos');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPay, setSelectedPay] = useState<Pagamento | null>(null);
  const [payForm, setPayForm] = useState({ child_id: '', mes: new Date().toISOString().slice(0, 7), valor_previsto: '', valor_recebido: '0', status: 'pendente' });
  const [savingPay, setSavingPay] = useState(false);

  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ child_id: '', tipo: 'particular', convenio: '', valor_sessao: '', sessoes_semanais: '5', duracao_min: '50', dia_vencimento: '5', status: 'ativo' });
  const [savingContract, setSavingContract] = useState(false);

  const [showExpModal, setShowExpModal] = useState(false);
  const [selectedExp, setSelectedExp] = useState<Despesa | null>(null);
  const [expForm, setExpForm] = useState({ descricao: '', categoria: 'adm' as Despesa['categoria'], valor: '', mes: new Date().toISOString().slice(0, 7), data: '', status: 'pago' as Despesa['status'], recorrente: false, notas: '', fornecedor_id: '' });
  const [expMeses, setExpMeses] = useState(1);
  const [savingExp, setSavingExp] = useState(false);
  const [darBaixaLoading, setDarBaixaLoading] = useState<number | null>(null);

  const despFileRef = useRef<HTMLInputElement>(null);
  const pagFileRef = useRef<HTMLInputElement>(null);
  const [despImportRows, setDespImportRows] = useState<ReturnType<typeof mapDespesa>[]>([]);
  const [pagImportRows, setPagImportRows] = useState<ReturnType<typeof mapPagamento>[]>([]);
  const [despImportState, setDespImportState] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [pagImportState, setPagImportState] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [despImportResult, setDespImportResult] = useState<{ ok: number; err: number } | null>(null);
  const [pagImportResult, setPagImportResult] = useState<{ ok: number; err: number } | null>(null);

  const months6 = useMemo(() => getLastNMonths(6), []);
  const months12 = useMemo(() => getLastNMonths(12), []);

  const monthPayments = useMemo(() => data.payments.filter((p) => p.mes === monthFilter), [data.payments, monthFilter]);
  const monthExpenses = useMemo(() => data.expenses.filter((e) => e.mes === monthFilter), [data.expenses, monthFilter]);

  // BI metrics (always from last 6 months)
  const bi = useMemo(() => {
    const rec6 = months6.reduce((s, m) => s + data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((ss, p) => ss + (p.valor_recebido ?? 0), 0), 0);
    const prev6 = months6.reduce((s, m) => s + data.payments.filter((p) => p.mes === m).reduce((ss, p) => ss + (p.valor_previsto ?? 0), 0), 0);
    const desp6 = months6.reduce((s, m) => s + data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((ss, e) => ss + e.valor, 0), 0);
    const resultado6 = rec6 - desp6;
    const margem = rec6 > 0 ? Math.round((resultado6 / rec6) * 100) : 0;
    const taxa = prev6 > 0 ? Math.round((rec6 / prev6) * 100) : 0;
    const inadimplentes = data.payments.filter((p) => p.status === 'inadimplente').length;
    const pendente = data.payments.filter((p) => p.status === 'pendente').reduce((s, p) => s + (p.valor_previsto ?? 0), 0);

    // Receita por paciente (acumulado)
    const byChild: Record<number, { name: string; receita: number; pendente: number }> = {};
    data.payments.forEach((p) => {
      const child = data.children.find((c) => c.id === p.child_id);
      if (!byChild[p.child_id]) byChild[p.child_id] = { name: child?.name ?? `#${p.child_id}`, receita: 0, pendente: 0 };
      if (p.status === 'recebido' || p.status === 'parcial') byChild[p.child_id].receita += p.valor_recebido ?? 0;
      if (p.status === 'pendente') byChild[p.child_id].pendente += p.valor_previsto ?? 0;
    });
    const topChildren = Object.values(byChild).sort((a, b) => b.receita - a.receita).slice(0, 6);

    // Despesas por categoria (6m)
    const byCat: Record<string, number> = {};
    data.expenses.filter((e) => months6.includes(e.mes) && e.status === 'pago').forEach((e) => {
      byCat[e.categoria] = (byCat[e.categoria] ?? 0) + e.valor;
    });
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

    // Status counts
    const sCounts = { recebido: 0, pendente: 0, inadimplente: 0, parcial: 0 };
    data.payments.forEach((p) => { if (p.status in sCounts) sCounts[p.status as keyof typeof sCounts]++; });

    // Cashflow acumulado
    let acc = 0;
    const cashflow = months12.map((m) => {
      const r = data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
      const d = data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0);
      acc += r - d;
      return { label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3), resultado: r - d, acumulado: acc };
    });

    return { rec6, prev6, desp6, resultado6, margem, taxa, inadimplentes, pendente, topChildren, topCat, sCounts, cashflow, totalPags: Object.values(sCounts).reduce((s, v) => s + v, 0) || 1 };
  }, [months6, months12, data]);

  const stats = useMemo(() => {
    const recebido = monthPayments.filter((p) => p.status === 'recebido' || p.status === 'parcial').reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const previsto = monthPayments.reduce((s, p) => s + (p.valor_previsto ?? 0), 0);
    const pendente = monthPayments.filter((p) => p.status === 'pendente').reduce((s, p) => s + (p.valor_previsto ?? 0), 0);
    const despesas = monthExpenses.filter((e) => e.status === 'pago').reduce((s, e) => s + e.valor, 0);
    return { recebido, previsto, pendente, count: monthPayments.length, despesas, resultado: recebido - despesas };
  }, [monthPayments, monthExpenses]);

  const childName = (id: number) => data.children.find((c) => c.id === id)?.name ?? '—';
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = -12; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({ val: d.toISOString().slice(0, 7), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts;
  }, []);

  // handlers
  function openNewPay() { setSelectedPay(null); setPayForm({ child_id: '', mes: monthFilter, valor_previsto: '', valor_recebido: '0', status: 'pendente' }); setShowPayModal(true); }
  function openEditPay(p: Pagamento) { setSelectedPay(p); setPayForm({ child_id: String(p.child_id), mes: p.mes, valor_previsto: String(p.valor_previsto ?? ''), valor_recebido: String(p.valor_recebido ?? 0), status: p.status }); setShowPayModal(true); }

  async function handleSavePay(e: React.FormEvent) {
    e.preventDefault();
    setSavingPay(true); setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload = { clinic_id: state.user?.clinicId, child_id: Number(payForm.child_id), mes: payForm.mes, valor_previsto: Number(payForm.valor_previsto), valor_recebido: Number(payForm.valor_recebido), status: payForm.status, data_pag: payForm.status === 'recebido' ? new Date().toISOString().slice(0, 10) : null };
      if (selectedPay) {
        const { data: upd, error } = await supabase.from('pagamentos').update(payload).eq('id', selectedPay.id).select().single();
        if (error) { setSaveError(error.message); return; }
        if (upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
      } else {
        const { data: created, error } = await supabase.from('pagamentos').insert(payload).select().single();
        if (error) { setSaveError(error.message); return; }
        if (created) dispatch({ type: 'ADD_PAYMENT', payload: created });
      }
      setShowPayModal(false);
    } catch (err: unknown) { setSaveError(err instanceof Error ? err.message : 'Erro'); }
    finally { setSavingPay(false); }
  }

  async function markReceived(p: Pagamento) {
    const { supabase } = await import('@/lib/supabase');
    const { data: upd } = await supabase.from('pagamentos').update({ status: 'recebido', valor_recebido: p.valor_previsto, data_pag: new Date().toISOString().slice(0, 10) }).eq('id', p.id).select().single();
    if (upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
  }

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault();
    setSavingContract(true); setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload: Partial<Contrato> = { clinic_id: state.user?.clinicId, child_id: Number(contractForm.child_id), tipo: contractForm.tipo, convenio: contractForm.tipo === 'convenio' ? contractForm.convenio || null : null, valor_sessao: Number(contractForm.valor_sessao) || null, sessoes_semanais: Number(contractForm.sessoes_semanais) || null, duracao_min: Number(contractForm.duracao_min) || null, dia_vencimento: Number(contractForm.dia_vencimento) || null, status: contractForm.status as Contrato['status'] };
      const { data: created, error } = await supabase.from('contratos').insert(payload).select().single();
      if (error) { setSaveError(error.message); return; }
      if (created) dispatch({ type: 'ADD_CONTRACT', payload: created });
      setShowContractModal(false);
    } catch (err: unknown) { setSaveError(err instanceof Error ? err.message : 'Erro'); }
    finally { setSavingContract(false); }
  }

  async function handleDespFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    const raw = await parseFile(file);
    const mapped = raw.map(mapDespesa).filter((r) => r.descricao.trim() && r.valor > 0);
    setDespImportRows(mapped); setDespImportResult(null); setDespImportState('preview');
  }

  async function handleConfirmDespImport() {
    setDespImportState('importing');
    try {
      const { supabase } = await import('@/lib/supabase');
      const clinic_id = state.user?.clinicId;
      let ok = 0; let err = 0;
      for (const row of despImportRows) {
        const { data: created, error } = await supabase.from('despesas').insert({
          descricao: row.descricao, categoria: (row.categoria as Despesa['categoria']) || 'outros',
          valor: row.valor, mes: row.mes, data: row.data || null,
          status: row.status as Despesa['status'], recorrente: false,
          notas: row.notas || null, clinic_id,
        }).select().single();
        if (error) err++; else if (created) { dispatch({ type: 'ADD_EXPENSE', payload: created }); ok++; }
      }
      setDespImportResult({ ok, err });
    } finally { setDespImportRows([]); setDespImportState('done'); }
  }

  async function handlePagFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    const raw = await parseFile(file);
    const mapped = raw.map(mapPagamento).filter((r) => r.child_name.trim() && r.valor_previsto > 0);
    setPagImportRows(mapped); setPagImportResult(null); setPagImportState('preview');
  }

  async function handleConfirmPagImport() {
    setPagImportState('importing');
    try {
      const { supabase } = await import('@/lib/supabase');
      const clinic_id = state.user?.clinicId;
      let ok = 0; let err = 0;
      for (const row of pagImportRows) {
        const child = data.children.find((c) => c.name.toLowerCase().includes(row.child_name.toLowerCase().slice(0, 6)));
        if (!child) { err++; continue; }
        const { data: created, error } = await supabase.from('pagamentos').insert({
          child_id: child.id, clinic_id, mes: row.mes,
          valor_previsto: row.valor_previsto, valor_recebido: row.valor_recebido,
          status: row.status as Pagamento['status'], data_pag: row.data_pag || null,
        }).select().single();
        if (error) err++; else if (created) { dispatch({ type: 'ADD_PAYMENT', payload: created }); ok++; }
      }
      setPagImportResult({ ok, err });
    } finally { setPagImportRows([]); setPagImportState('done'); }
  }

  function handleExportDespesas() {
    const rows = data.expenses.map((e) => ({
      Descricao: e.descricao, Categoria: CAT_LABELS[e.categoria] ?? e.categoria,
      Valor: e.valor, Mes: e.mes, Data: e.data ?? '', Status: e.status,
      Recorrente: e.recorrente ? 'Sim' : 'Nao', Notas: e.notas ?? '',
    }));
    exportToExcel(rows, 'despesas', 'Despesas');
  }

  function handleExportPagamentos() {
    const rows = data.payments.map((p) => {
      const child = data.children.find((c) => c.id === p.child_id);
      return {
        Paciente: child?.name ?? `#${p.child_id}`, Mes: p.mes,
        Valor_Previsto: p.valor_previsto, Valor_Recebido: p.valor_recebido,
        Status: p.status, Data_Pagamento: p.data_pag ?? '',
      };
    });
    exportToCSV(rows, 'recebimentos');
  }

  async function darBaixaContrato(c: Contrato) {
    if (darBaixaLoading !== null) return;
    setDarBaixaLoading(c.id);
    const mes = monthFilter;
    const valorMensal = (c.valor_sessao ?? 0) * (c.sessoes_semanais ?? 0) * 4;
    try {
      const { supabase } = await import('@/lib/supabase');
      const today = new Date().toISOString().slice(0, 10);

      // tenta encontrar pagamento existente por contrato_id
      const existingByContrato = data.payments.find((p) => p.contrato_id != null && p.contrato_id === c.id && p.mes === mes);
      // fallback: pagamento sem contrato_id para o mesmo paciente/mês
      const existingByChild = data.payments.find((p) => p.child_id === c.child_id && p.mes === mes && !p.contrato_id);

      const existing = existingByContrato ?? null;

      if (existing) {
        const { data: upd, error } = await supabase
          .from('pagamentos')
          .update({ status: 'recebido', valor_recebido: valorMensal, data_pag: today })
          .eq('id', existing.id)
          .select().single();
        if (!error && upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
        if (error) setSaveError(`Erro ao atualizar: ${error.message}`);
      } else {
        // Tenta inserir COM contrato_id; se der 400 (coluna não existe), insere sem ela
        const basePayload = { clinic_id: state.user?.clinicId, child_id: c.child_id, mes, valor_previsto: valorMensal, valor_recebido: valorMensal, status: 'recebido', data_pag: today };

        // Se já existe um pagamento sem contrato_id para esse paciente/mês, atualiza ele
        if (existingByChild) {
          const { data: upd, error } = await supabase
            .from('pagamentos')
            .update({ status: 'recebido', valor_recebido: valorMensal, data_pag: today, contrato_id: c.id })
            .eq('id', existingByChild.id)
            .select().single();
          if (!error && upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
          // se erro na coluna contrato_id, tenta sem ela
          if (error?.code === 'PGRST204' || error?.message?.includes('contrato_id')) {
            const { data: upd2 } = await supabase.from('pagamentos').update({ status: 'recebido', valor_recebido: valorMensal, data_pag: today }).eq('id', existingByChild.id).select().single();
            if (upd2) dispatch({ type: 'UPDATE_PAYMENT', payload: upd2 });
          }
        } else {
          // Tenta inserir com contrato_id
          const { data: created, error } = await supabase
            .from('pagamentos')
            .insert({ ...basePayload, contrato_id: c.id })
            .select().single();
          if (!error && created) {
            dispatch({ type: 'ADD_PAYMENT', payload: created });
          } else if (error?.code === 'PGRST204' || error?.message?.includes('contrato_id')) {
            // Coluna contrato_id não existe ainda — insere sem ela
            const { data: created2, error: err2 } = await supabase.from('pagamentos').insert(basePayload).select().single();
            if (!err2 && created2) dispatch({ type: 'ADD_PAYMENT', payload: created2 });
            if (err2) setSaveError(`Erro: ${err2.message}. Execute a migration 20260722c no Supabase.`);
          } else if (error) {
            setSaveError(`Erro ao dar baixa: ${error.message}`);
          }
        }
      }
    } finally {
      setDarBaixaLoading(null);
    }
  }

  function openNewExp() { setSelectedExp(null); setExpForm({ descricao: '', categoria: 'adm', valor: '', mes: monthFilter, data: '', status: 'pago', recorrente: false, notas: '', fornecedor_id: '' }); setShowExpModal(true); }
  function openEditExp(e: Despesa) { setSelectedExp(e); setExpForm({ descricao: e.descricao, categoria: e.categoria, valor: String(e.valor), mes: e.mes, data: e.data ?? '', status: e.status, recorrente: e.recorrente, notas: e.notas ?? '', fornecedor_id: e.fornecedor_id ? String(e.fornecedor_id) : '' }); setShowExpModal(true); }

  async function darBaixaDespesa(e: Despesa) {
    const { supabase } = await import('@/lib/supabase');
    const { data: upd } = await supabase.from('despesas').update({ status: 'pago', data: e.data || new Date().toISOString().slice(0, 10) }).eq('id', e.id).select().single();
    if (upd) dispatch({ type: 'UPDATE_EXPENSE', payload: upd });
  }

  async function handleSaveExp(e: React.FormEvent) {
    e.preventDefault();
    setSavingExp(true); setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const basePayload = { clinic_id: state.user?.clinicId, descricao: expForm.descricao, categoria: expForm.categoria, valor: Number(expForm.valor), data: expForm.data || null, status: expForm.status, recorrente: expForm.recorrente, notas: expForm.notas || null, fornecedor_id: Number(expForm.fornecedor_id) || null };
      if (selectedExp) {
        const { data: upd, error } = await supabase.from('despesas').update({ ...basePayload, mes: expForm.mes }).eq('id', selectedExp.id).select().single();
        if (error) { setSaveError(error.message); return; }
        if (upd) dispatch({ type: 'UPDATE_EXPENSE', payload: upd });
      } else {
        // Gera N meses a partir do mês inicial
        const [baseYear, baseMonth] = expForm.mes.split('-').map(Number);
        const inserts = Array.from({ length: expMeses }, (_, i) => {
          const d = new Date(baseYear, baseMonth - 1 + i, 1);
          const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return { ...basePayload, mes };
        });
        const { data: created, error } = await supabase.from('despesas').insert(inserts).select();
        if (error) { setSaveError(error.message); return; }
        if (created) created.forEach((exp) => dispatch({ type: 'ADD_EXPENSE', payload: exp }));
      }
      setShowExpModal(false);
      setExpMeses(1);
    } catch (err: unknown) { setSaveError(err instanceof Error ? err.message : 'Erro'); }
    finally { setSavingExp(false); }
  }

  async function deleteExp(id: number) {
    if (!confirm('Excluir esta despesa?')) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('despesas').delete().eq('id', id);
    dispatch({ type: 'DELETE_EXPENSE', payload: id });
  }

  const STATUS_BADGE: Record<string, { color: string; bg: string }> = {
    recebido: { color: '#10b981', bg: 'rgba(16,185,129,.12)' },
    pendente: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    inadimplente: { color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
    parcial: { color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
    pago: { color: '#10b981', bg: 'rgba(16,185,129,.12)' },
  };
  const statusLabel: Record<string, string> = { recebido: 'Recebido', pendente: 'Pendente', inadimplente: 'Inadimplente', parcial: 'Parcial', pago: 'Pago' };

  const TABS: { key: TabType; label: string }[] = [
    { key: 'pagamentos', label: 'Pagamentos' },
    { key: 'contratos',  label: 'Contratos' },
    { key: 'despesas',   label: 'Despesas' },
    { key: 'dre',        label: 'DRE' },
    { key: 'bi',         label: 'BI Financeiro' },
  ];

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };

  const maxChild = Math.max(...bi.topChildren.map((c) => c.receita + c.pendente), 1);
  const maxCat = Math.max(...bi.topCat.map((c) => c[1]), 1);

  return (
    <div className="view show" id="v-financeiro">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Financeiro</div>
          <h1 className="ph-title">Financeiro</h1>
          <div className="ph-sub">Visao geral · Pagamentos · Contratos · Despesas · DRE</div>
        </div>

        {/* ── BI SEMPRE VISÍVEL ─────────────────────────────── */}

        {/* KPI heroes com sparkline */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
          {/* Receita */}
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '16px 18px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Receita — 6 meses</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{formatCurrency(bi.rec6)}</div>
            <div style={{ fontSize: 11, color: '#10b981', opacity: .65, marginTop: 4, fontWeight: 600 }}>Previsto: {formatCurrency(bi.prev6)}</div>
            <div style={{ marginTop: 10 }}>
              <Sparkline values={months6.map((m) => data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0))} color="#10b981" height={44} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: bi.taxa >= 80 ? '#10b981' : '#f59e0b', background: bi.taxa >= 80 ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)', padding: '3px 8px', borderRadius: 20 }}>
                {bi.taxa}% recebido
              </span>
            </div>
          </div>
          {/* Despesas */}
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '16px 18px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Despesas — 6 meses</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{formatCurrency(bi.desp6)}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, fontWeight: 600 }}>{bi.topCat[0] ? `Maior: ${CAT_LABELS[bi.topCat[0][0] as Despesa['categoria']] ?? bi.topCat[0][0]}` : 'Sem despesas'}</div>
            <div style={{ marginTop: 10 }}>
              <Sparkline values={months6.map((m) => data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0))} color="#ef4444" height={44} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              {bi.inadimplentes > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,.12)', padding: '3px 8px', borderRadius: 20 }}>{bi.inadimplentes} inadimplente(s)</span>}
              {bi.pendente > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,.12)', padding: '3px 8px', borderRadius: 20 }}>Em aberto: {formatCurrency(bi.pendente)}</span>}
            </div>
          </div>
          {/* Resultado */}
          <div style={{ background: bi.resultado6 >= 0 ? 'rgba(16,185,129,.05)' : 'rgba(239,68,68,.05)', border: `1px solid ${bi.resultado6 >= 0 ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'}`, borderRadius: 'var(--r)', padding: '16px 18px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Resultado — 6 meses</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: bi.resultado6 >= 0 ? '#10b981' : '#ef4444', lineHeight: 1 }}>{formatCurrency(bi.resultado6)}</div>
            <div style={{ fontSize: 11, color: bi.resultado6 >= 0 ? '#10b981' : '#ef4444', opacity: .7, marginTop: 4, fontWeight: 600 }}>Margem: {bi.margem}%</div>
            <div style={{ marginTop: 10 }}>
              <Sparkline values={months6.map((m) => {
                const r = data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
                const d = data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0);
                return r - d;
              })} color={bi.resultado6 >= 0 ? '#10b981' : '#ef4444'} height={44} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: bi.resultado6 >= 0 ? '#10b981' : '#ef4444', background: bi.resultado6 >= 0 ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', padding: '3px 8px', borderRadius: 20 }}>
                {bi.resultado6 >= 0 ? 'Lucro' : 'Prejuizo'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)' }}>cashflow: {formatCurrency(bi.cashflow[bi.cashflow.length - 1]?.acumulado ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* KPI secundários */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Taxa recebimento', value: `${bi.taxa}%`, color: bi.taxa >= 80 ? '#10b981' : '#f59e0b' },
            { label: 'Em aberto', value: formatCurrency(bi.pendente), color: '#f59e0b' },
            { label: 'Inadimplentes', value: String(bi.inadimplentes), color: '#ef4444' },
            { label: 'Pacientes ativos', value: String(data.children.filter((c) => c.status === 'ativo').length), color: 'var(--v)' },
            { label: 'Contratos ativos', value: String(data.contracts.filter((c) => c.status === 'ativo').length), color: 'var(--p)' },
          ].map((k) => (
            <div key={k.label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginTop: 5 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Gráfico principal + Status cobranças */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, marginBottom: 14 }}>
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)' }}>Receita × Despesas — 6 meses</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['rgba(99,102,241,.4)', 'Previsto'], ['#10b981', 'Recebido'], ['#ef4444', 'Despesas']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--t3)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
            <BarChart months={months6} payments={data.payments} expenses={data.expenses} />
          </div>

          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)', marginBottom: 12 }}>Status cobranças</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <DonutChart segments={[
                { value: bi.sCounts.recebido, color: '#10b981', label: 'Recebido' },
                { value: bi.sCounts.pendente, color: '#f59e0b', label: 'Pendente' },
                { value: bi.sCounts.parcial, color: '#8b5cf6', label: 'Parcial' },
                { value: bi.sCounts.inadimplente, color: '#ef4444', label: 'Inadimplente' },
              ]} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { key: 'recebido', label: 'Recebido', color: '#10b981' },
                  { key: 'pendente', label: 'Pendente', color: '#f59e0b' },
                  { key: 'parcial', label: 'Parcial', color: '#8b5cf6' },
                  { key: 'inadimplente', label: 'Inad.', color: '#ef4444' },
                ].map(({ key, label, color }) => {
                  const count = bi.sCounts[key as keyof typeof bi.sCounts];
                  const pct = Math.round((count / bi.totalPags) * 100);
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t2)', flex: 1 }}>{label}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color, minWidth: 16, textAlign: 'right' }}>{count}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', minWidth: 30, textAlign: 'right' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Resultado mensal + Receita por paciente + Despesas por categoria */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          {/* Resultado mensal 12m */}
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)', marginBottom: 10 }}>Resultado mensal — 12m</div>
            <ResultadoChart months={months12} payments={data.payments} expenses={data.expenses} />
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>Cashflow acumulado</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: bi.cashflow[bi.cashflow.length - 1]?.acumulado >= 0 ? '#10b981' : '#ef4444' }}>
                {formatCurrency(bi.cashflow[bi.cashflow.length - 1]?.acumulado ?? 0)}
              </span>
            </div>
          </div>

          {/* Receita por paciente */}
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)', marginBottom: 14 }}>Receita por paciente</div>
            {bi.topChildren.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Sem dados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {bi.topChildren.map((c) => (
                  <div key={c.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{c.name}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', flexShrink: 0 }}>{formatCurrency(c.receita)}</div>
                    </div>
                    <div style={{ height: 6, background: 'var(--sf2)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${((c.receita + c.pendente) / maxChild) * 100}%`, background: 'rgba(245,158,11,.3)', borderRadius: 3 }} />
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(c.receita / maxChild) * 100}%`, background: 'var(--p)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Despesas por categoria */}
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)', marginBottom: 14 }}>Despesas por categoria</div>
            {bi.topCat.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Sem despesas pagas</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {bi.topCat.map(([cat, val]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: CAT_COLORS[cat as Despesa['categoria']] ?? '#6b7280', flexShrink: 0 }} />
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)' }}>{CAT_LABELS[cat as Despesa['categoria']] ?? cat}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', flexShrink: 0 }}>{formatCurrency(val)}</div>
                    </div>
                    <div style={{ height: 6, background: 'var(--sf2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(val / maxCat) * 100}%`, background: CAT_COLORS[cat as Despesa['categoria']] ?? '#6b7280', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
                <div style={{ paddingTop: 8, borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>Total 6 meses</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#ef4444' }}>{formatCurrency(bi.desp6)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divisor módulos operacionais */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ height: 1, flex: 1, background: 'var(--bdr)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>Modulos operacionais</div>
          <div style={{ height: 1, flex: 1, background: 'var(--bdr)' }} />
        </div>

        {/* ── TABS OPERACIONAIS ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--bdr)', overflowX: 'auto' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 18px', border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--p)' : 'transparent'}`, background: 'none', color: tab === key ? 'var(--p)' : 'var(--t2)', fontWeight: tab === key ? 700 : 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Month filter */}
        {tab !== 'dre' && tab !== 'bi' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit' }}>
              {monthOptions.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            {tab === 'pagamentos' && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={handleExportPagamentos} style={{ padding: '8px 11px', border: '1px solid var(--bdr)', borderRadius: 8, background: 'none', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↓ CSV</button>
                <button onClick={() => pagFileRef.current?.click()} style={{ padding: '8px 11px', border: '1px solid var(--p)', borderRadius: 8, background: 'var(--ps)', color: 'var(--p)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>↑ Importar</button>
                <input ref={pagFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handlePagFileSelect} />
                <button className="btn-p" onClick={openNewPay}>+ Cobrar</button>
              </div>
            )}
            {tab === 'despesas' && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={handleExportDespesas} style={{ padding: '8px 11px', border: '1px solid var(--bdr)', borderRadius: 8, background: 'none', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↓ Excel</button>
                <button onClick={() => despFileRef.current?.click()} style={{ padding: '8px 11px', border: '1px solid var(--p)', borderRadius: 8, background: 'var(--ps)', color: 'var(--p)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>↑ Importar</button>
                <input ref={despFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleDespFileSelect} />
                <button className="btn-p" onClick={openNewExp}>+ Nova despesa</button>
              </div>
            )}
            {tab === 'contratos' && <button className="btn-p" onClick={() => { setSaveError(null); setShowContractModal(true); }} style={{ marginLeft: 'auto' }}>+ Novo contrato</button>}
          </div>
        )}

        {/* Import result banners */}
        {pagImportResult && pagImportState === 'done' && tab === 'pagamentos' && (
          <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 10, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', color: '#10b981', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>✓ {pagImportResult.ok} recebimento(s) importado(s){pagImportResult.err > 0 ? ` · ${pagImportResult.err} não encontrado(s)` : ''}</span>
            <button onClick={() => setPagImportState('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>
          </div>
        )}
        {despImportResult && despImportState === 'done' && tab === 'despesas' && (
          <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 10, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', color: '#10b981', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>✓ {despImportResult.ok} despesa(s) importada(s){despImportResult.err > 0 ? ` · ${despImportResult.err} erro(s)` : ''}</span>
            <button onClick={() => setDespImportState('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* TAB: Pagamentos */}
        {tab === 'pagamentos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monthPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Nenhum pagamento neste mes</div>
            ) : monthPayments.map((p) => {
              const st = STATUS_BADGE[p.status] ?? { color: 'var(--t3)', bg: 'var(--sf2)' };
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{childName(p.child_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>{p.mes} · Previsto: {formatCurrency(p.valor_previsto)}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{formatCurrency(p.valor_recebido)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{statusLabel[p.status] ?? p.status}</span>
                  {p.status === 'pendente' && <button onClick={() => markReceived(p)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Dar baixa</button>}
                  <button onClick={() => openEditPay(p)} style={{ background: 'none', border: '1px solid var(--bdr)', borderRadius: 8, padding: '6px 10px', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Contratos */}
        {tab === 'contratos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.contracts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Nenhum contrato cadastrado</div>
            ) : data.contracts.map((c) => {
              const valorMensal = (c.valor_sessao ?? 0) * (c.sessoes_semanais ?? 0) * 4;
              const pagMes = data.payments.find((p) => p.contrato_id === c.id && p.mes === monthFilter);
              const jaBaixado = pagMes?.status === 'recebido' || pagMes?.status === 'parcial';
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{childName(c.child_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {c.sessoes_semanais}x/sem · Vto dia {c.dia_vencimento} · {c.tipo ?? 'particular'}{valorMensal > 0 ? ` · Mensal: ${formatCurrency(valorMensal)}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{formatCurrency(c.valor_sessao ?? 0)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>/sessao</span></div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: c.status === 'ativo' ? 'rgba(16,185,129,.12)' : 'var(--sf2)', color: c.status === 'ativo' ? '#10b981' : 'var(--t3)' }}>{c.status}</span>
                  {c.status === 'ativo' && (jaBaixado
                    ? <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>Recebido em {monthFilter}</span>
                    : <button
                        onClick={() => darBaixaContrato(c)}
                        disabled={darBaixaLoading !== null}
                        style={{ padding: '6px 14px', background: darBaixaLoading === c.id ? '#059669' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: darBaixaLoading !== null ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: darBaixaLoading !== null && darBaixaLoading !== c.id ? .5 : 1, minWidth: 90 }}>
                        {darBaixaLoading === c.id ? 'Salvando...' : 'Dar baixa'}
                      </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Despesas */}
        {tab === 'despesas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monthExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>Nenhuma despesa neste mes</div>
            ) : monthExpenses.map((e) => {
              const st = e.status === 'pago' ? STATUS_BADGE.pago : STATUS_BADGE.pendente;
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, flexWrap: 'wrap' }}>
                  <div style={{ width: 5, height: 36, borderRadius: 3, background: CAT_COLORS[e.categoria] ?? '#6b7280', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{e.descricao}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>{CAT_LABELS[e.categoria]}{e.recorrente ? ' · Recorrente' : ''}{e.data ? ` · ${e.data}` : ''}{e.fornecedor_id ? ` · ${(data.fornecedores ?? []).find(f => f.id === e.fornecedor_id)?.nome ?? ''}` : ''}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{formatCurrency(e.valor)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20 }}>{statusLabel[e.status]}</span>
                  {e.status === 'pendente' && <button onClick={() => darBaixaDespesa(e)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Dar baixa</button>}
                  <button onClick={() => openEditExp(e)} style={{ background: 'none', border: '1px solid var(--bdr)', borderRadius: 8, padding: '6px 10px', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                  <button onClick={() => deleteExp(e.id)} style={{ background: 'none', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '6px 10px', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                </div>
              );
            })}
            {monthExpenses.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>Total pagas no mes</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#ef4444' }}>{formatCurrency(stats.despesas)}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'dre' && <DreTab />}
        {tab === 'bi' && <BiFinanceiro />}
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowPayModal(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', margin: 0 }}>{selectedPay ? 'Editar pagamento' : 'Novo pagamento'}</h2>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleSavePay} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Paciente *</label>
                <select value={payForm.child_id} onChange={(e) => setPayForm(f => ({ ...f, child_id: e.target.value }))} required style={inp}>
                  <option value="">Selecione...</option>
                  {data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Mes ref.</label><input type="month" value={payForm.mes} onChange={(e) => setPayForm(f => ({ ...f, mes: e.target.value }))} required style={inp} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor previsto (R$)</label><input type="number" value={payForm.valor_previsto} onChange={(e) => setPayForm(f => ({ ...f, valor_previsto: e.target.value }))} required min="0" step="0.01" style={inp} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={payForm.status} onChange={(e) => setPayForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                    <option value="pendente">Pendente</option><option value="recebido">Recebido</option><option value="parcial">Parcial</option><option value="inadimplente">Inadimplente</option>
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor recebido (R$)</label><input type="number" value={payForm.valor_recebido} onChange={(e) => setPayForm(f => ({ ...f, valor_recebido: e.target.value }))} min="0" step="0.01" style={inp} /></div>
              </div>
              {saveError && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}><strong>Erro:</strong> {saveError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={savingPay} className="btn-p" style={{ flex: 2 }}>{savingPay ? 'Salvando...' : selectedPay ? 'Salvar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {showContractModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowContractModal(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', margin: 0 }}>Novo contrato</h2>
              <button onClick={() => setShowContractModal(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleSaveContract} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Paciente *</label>
                <select value={contractForm.child_id} onChange={(e) => setContractForm(f => ({ ...f, child_id: e.target.value }))} required style={inp}>
                  <option value="">Selecione...</option>
                  {data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Tipo</label>
                  <select value={contractForm.tipo} onChange={(e) => setContractForm(f => ({ ...f, tipo: e.target.value }))} style={inp}>
                    <option value="particular">Particular</option><option value="convenio">Convenio</option>
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor/sessao (R$)</label><input type="number" value={contractForm.valor_sessao} onChange={(e) => setContractForm(f => ({ ...f, valor_sessao: e.target.value }))} min="0" step="0.01" style={inp} /></div>
              </div>
              {contractForm.tipo === 'convenio' && <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Convenio</label><input value={contractForm.convenio} onChange={(e) => setContractForm(f => ({ ...f, convenio: e.target.value }))} placeholder="Nome do convenio" style={inp} /></div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Sessoes/sem</label><input type="number" value={contractForm.sessoes_semanais} onChange={(e) => setContractForm(f => ({ ...f, sessoes_semanais: e.target.value }))} min="1" max="30" style={inp} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Duracao (min)</label><input type="number" value={contractForm.duracao_min} onChange={(e) => setContractForm(f => ({ ...f, duracao_min: e.target.value }))} min="15" max="240" step="5" style={inp} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Vto. dia</label><input type="number" value={contractForm.dia_vencimento} onChange={(e) => setContractForm(f => ({ ...f, dia_vencimento: e.target.value }))} min="1" max="31" style={inp} /></div>
              </div>
              {saveError && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}><strong>Erro:</strong> {saveError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowContractModal(false)} style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={savingContract} className="btn-p" style={{ flex: 2 }}>{savingContract ? 'Salvando...' : 'Criar contrato'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowExpModal(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', margin: 0 }}>{selectedExp ? 'Editar despesa' : 'Nova despesa'}</h2>
              <button onClick={() => setShowExpModal(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleSaveExp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Descricao *</label><input value={expForm.descricao} onChange={(e) => setExpForm(f => ({ ...f, descricao: e.target.value }))} required placeholder="Ex: Aluguel sala" style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Categoria</label>
                  <select value={expForm.categoria} onChange={(e) => setExpForm(f => ({ ...f, categoria: e.target.value as Despesa['categoria'] }))} style={inp}>
                    {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor (R$) *</label><input type="number" value={expForm.valor} onChange={(e) => setExpForm(f => ({ ...f, valor: e.target.value }))} required min="0" step="0.01" style={inp} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Mês inicial *</label><input type="month" value={expForm.mes} onChange={(e) => setExpForm(f => ({ ...f, mes: e.target.value }))} required style={inp} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Data pagamento</label><input type="date" value={expForm.data} onChange={(e) => setExpForm(f => ({ ...f, data: e.target.value }))} style={inp} /></div>
              </div>
              {!selectedExp && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>
                    Provisionar por quantos meses?
                    <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--t3)' }}>({expMeses} {expMeses === 1 ? 'mês' : 'meses'})</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={1} max={24} value={expMeses} onChange={(e) => setExpMeses(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--p)' }} />
                    <input type="number" min={1} max={24} value={expMeses} onChange={(e) => setExpMeses(Math.max(1, Math.min(24, Number(e.target.value))))}
                      style={{ ...inp, width: 60, textAlign: 'center', padding: '8px 6px' }} />
                  </div>
                  {expMeses > 1 && (
                    <div style={{ fontSize: 11, color: 'var(--p)', marginTop: 4, fontWeight: 600 }}>
                      Serão criadas {expMeses} despesas: {expForm.mes} até {(() => { const [y, m] = expForm.mes.split('-').map(Number); const d = new Date(y, m - 1 + expMeses - 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={expForm.status} onChange={(e) => setExpForm(f => ({ ...f, status: e.target.value as Despesa['status'] }))} style={inp}>
                    <option value="pago">Pago</option><option value="pendente">Pendente</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--t2)', fontWeight: 600 }}>
                    <input type="checkbox" checked={expForm.recorrente} onChange={(e) => setExpForm(f => ({ ...f, recorrente: e.target.checked }))} />
                    Recorrente mensal
                  </label>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Fornecedor</label>
                <select value={expForm.fornecedor_id} onChange={(e) => setExpForm(f => ({ ...f, fornecedor_id: e.target.value }))} style={{ padding: '10px 13px', border: '1.5px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }}>
                  <option value="">Nenhum fornecedor</option>
                  {(data.fornecedores ?? []).map((f) => {
                    const FORN_EMOJI: Record<string, string> = { energia: '⚡', agua: '💧', telefone: '📱', internet: '🌐', aluguel: '🏠', material: '📦', contabilidade: '📊', juridico: '⚖️', manutencao: '🔧', equipamentos: '💻', software: '🖥️', folha: '👥', outros: '📋' };
                    const emoji = FORN_EMOJI[f.categoria] ?? '📋';
                    return <option key={f.id} value={String(f.id)}>{emoji} {f.nome}</option>;
                  })}
                </select>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Notas</label><textarea value={expForm.notas} onChange={(e) => setExpForm(f => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Observacoes..." style={{ ...inp, resize: 'vertical' }} /></div>
              {saveError && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}><strong>Erro:</strong> {saveError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowExpModal(false)} style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={savingExp} className="btn-p" style={{ flex: 2 }}>{savingExp ? 'Salvando...' : selectedExp ? 'Salvar' : 'Lancar despesa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Despesas Import Preview Modal */}
      {(despImportState === 'preview' || despImportState === 'importing') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => despImportState === 'preview' && setDespImportState('idle')}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', padding: '18px 22px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📥</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Importar despesas</div>
                <div style={{ fontSize: 12, opacity: .8 }}>{despImportRows.length} lançamento(s) encontrado(s)</div>
              </div>
              {despImportState === 'preview' && <button onClick={() => setDespImportState('idle')} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
            </div>
            <div style={{ padding: '14px 20px', maxHeight: '45vh', overflowY: 'auto' }}>
              {despImportRows.slice(0, 8).map((r, i) => (
                <div key={i} style={{ padding: '8px 10px', background: 'var(--sf)', borderRadius: 8, marginBottom: 6, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--t1)' }}>{r.descricao}</div>
                    <div style={{ color: 'var(--t3)', fontSize: 12 }}>{CAT_LABELS[r.categoria] ?? r.categoria} · {r.mes}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--t1)', flexShrink: 0, marginLeft: 10 }}>{formatCurrency(r.valor)}</div>
                </div>
              ))}
              {despImportRows.length > 8 && <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>... e mais {despImportRows.length - 8}</div>}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bdr)', display: 'flex', gap: 10 }}>
              <button onClick={() => setDespImportState('idle')} disabled={despImportState === 'importing'} style={{ flex: 1, padding: '10px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={handleConfirmDespImport} disabled={despImportState === 'importing'} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: despImportState === 'importing' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: despImportState === 'importing' ? .7 : 1 }}>
                {despImportState === 'importing' ? 'Importando...' : `Importar ${despImportRows.length} despesa(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagamentos Import Preview Modal */}
      {(pagImportState === 'preview' || pagImportState === 'importing') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => pagImportState === 'preview' && setPagImportState('idle')}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg,#059669,#2563eb)', padding: '18px 22px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📥</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Importar recebimentos</div>
                <div style={{ fontSize: 12, opacity: .8 }}>{pagImportRows.length} registro(s) encontrado(s)</div>
              </div>
              {pagImportState === 'preview' && <button onClick={() => setPagImportState('idle')} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
            </div>
            <div style={{ padding: '10px 18px 0', background: 'transparent' }}>
              <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,.08)', borderLeft: '3px solid #f59e0b', borderRadius: 6, fontSize: 12, color: 'var(--t2)' }}>
                O paciente será vinculado pelo nome. Cadastre os pacientes antes de importar.
              </div>
            </div>
            <div style={{ padding: '14px 20px', maxHeight: '40vh', overflowY: 'auto' }}>
              {pagImportRows.slice(0, 8).map((r, i) => (
                <div key={i} style={{ padding: '8px 10px', background: 'var(--sf)', borderRadius: 8, marginBottom: 6, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--t1)' }}>{r.child_name}</div>
                    <div style={{ color: 'var(--t3)', fontSize: 12 }}>{r.mes} · {r.status}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--t1)', flexShrink: 0, marginLeft: 10 }}>{formatCurrency(r.valor_previsto)}</div>
                </div>
              ))}
              {pagImportRows.length > 8 && <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>... e mais {pagImportRows.length - 8}</div>}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bdr)', display: 'flex', gap: 10 }}>
              <button onClick={() => setPagImportState('idle')} disabled={pagImportState === 'importing'} style={{ flex: 1, padding: '10px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={handleConfirmPagImport} disabled={pagImportState === 'importing'} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#2563eb)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: pagImportState === 'importing' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: pagImportState === 'importing' ? .7 : 1 }}>
                {pagImportState === 'importing' ? 'Importando...' : `Importar ${pagImportRows.length} registro(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
