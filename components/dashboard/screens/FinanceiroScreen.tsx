'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, MONTH_NAMES, getLastNMonths } from '@/lib/utils';
import type { Pagamento, Contrato, Despesa } from '@/lib/types';

type TabType = 'pagamentos' | 'contratos' | 'despesas' | 'dre' | 'relatorios';

const CAT_LABELS: Record<Despesa['categoria'], string> = {
  folha: 'Folha de pagamento',
  aluguel: 'Aluguel',
  marketing: 'Marketing',
  equipamentos: 'Equipamentos',
  adm: 'Administrativo',
  outros: 'Outros',
};
const CAT_COLORS: Record<Despesa['categoria'], string> = {
  folha: '#8b5cf6',
  aluguel: '#f59e0b',
  marketing: '#3b82f6',
  equipamentos: '#06b6d4',
  adm: '#ec4899',
  outros: '#6b7280',
};

// ─── BI Financeiro Robusto ───────────────────────────────
function BiFinanceiro() {
  const { state } = useApp();
  const { data } = state;
  const months = useMemo(() => getLastNMonths(6), []);
  const months12 = useMemo(() => getLastNMonths(12), []);

  // Receita vs Despesa por mes
  const rvd = useMemo(() => months.map((m) => ({
    label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3),
    receita: data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0),
    previsto: data.payments.filter((p) => p.mes === m).reduce((s, p) => s + (p.valor_previsto ?? 0), 0),
    despesa: data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0),
  })), [months, data.payments, data.expenses]);

  // Cashflow acumulado 12 meses
  const cashflow = useMemo(() => {
    let acc = 0;
    return months12.map((m) => {
      const rec = data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
      const desp = data.expenses.filter((e) => e.mes === m && e.status === 'pago').reduce((s, e) => s + e.valor, 0);
      acc += rec - desp;
      return { label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3) + '/' + m.slice(2, 4), resultado: rec - desp, acumulado: acc };
    });
  }, [months12, data.payments, data.expenses]);

  const maxRvd = Math.max(...rvd.map((m) => Math.max(m.previsto, m.despesa)), 1);
  const maxCash = Math.max(...cashflow.map((m) => Math.abs(m.resultado)), 1);

  const totalRec6 = rvd.reduce((s, m) => s + m.receita, 0);
  const totalDesp6 = rvd.reduce((s, m) => s + m.despesa, 0);
  const totalPrev6 = rvd.reduce((s, m) => s + m.previsto, 0);
  const resultado6 = totalRec6 - totalDesp6;
  const margem6 = totalRec6 > 0 ? Math.round((resultado6 / totalRec6) * 100) : 0;
  const taxaRec = totalPrev6 > 0 ? Math.round((totalRec6 / totalPrev6) * 100) : 0;
  const inadimplentes = data.payments.filter((p) => p.status === 'inadimplente').length;

  // Receita por paciente
  const byChild = useMemo(() => {
    const map: Record<number, { name: string; receita: number; pendente: number }> = {};
    data.payments.forEach((p) => {
      const child = data.children.find((c) => c.id === p.child_id);
      if (!map[p.child_id]) map[p.child_id] = { name: child?.name ?? `#${p.child_id}`, receita: 0, pendente: 0 };
      if (p.status === 'recebido' || p.status === 'parcial') map[p.child_id].receita += p.valor_recebido ?? 0;
      if (p.status === 'pendente') map[p.child_id].pendente += p.valor_previsto ?? 0;
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, 8);
  }, [data.payments, data.children]);
  const maxChild = Math.max(...byChild.map((c) => c.receita + c.pendente), 1);

  // Despesas por categoria (acumulado 6 meses)
  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    data.expenses.filter((e) => months.includes(e.mes) && e.status === 'pago').forEach((e) => {
      map[e.categoria] = (map[e.categoria] ?? 0) + e.valor;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.expenses, months]);
  const maxCat = Math.max(...byCat.map((c) => c[1]), 1);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { recebido: 0, pendente: 0, inadimplente: 0, parcial: 0 };
    data.payments.forEach((p) => { if (p.status in counts) counts[p.status as keyof typeof counts]++; });
    return counts;
  }, [data.payments]);
  const totalPags = Object.values(statusCounts).reduce((s, v) => s + v, 0) || 1;

  function KpiCard({ value, label, color, sub }: { value: string | number; label: string; color: string; sub?: string }) {
    return (
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '16px 14px' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color, opacity: .6, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginTop: 6 }}>{label}</div>
      </div>
    );
  }

  function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px', ...style }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)', marginBottom: 16, letterSpacing: '-.2px' }}>{title}</div>
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
        <KpiCard value={formatCurrency(totalRec6)} label="Receita (6 meses)" color="#10b981" />
        <KpiCard value={formatCurrency(totalDesp6)} label="Despesas (6 meses)" color="#ef4444" />
        <KpiCard value={formatCurrency(resultado6)} label="Resultado (6 meses)" color={resultado6 >= 0 ? '#10b981' : '#ef4444'} />
        <KpiCard value={`${margem6}%`} label="Margem liquida" color={margem6 >= 30 ? '#10b981' : margem6 >= 10 ? '#f59e0b' : '#ef4444'} />
        <KpiCard value={`${taxaRec}%`} label="Taxa de recebimento" color={taxaRec >= 80 ? '#10b981' : '#f59e0b'} />
        <KpiCard value={inadimplentes} label="Inadimplentes" color="#ef4444" />
        <KpiCard value={data.children.filter((c) => c.status === 'ativo').length} label="Pacientes ativos" color="var(--v)" />
        <KpiCard value={data.payments.length > 0 ? formatCurrency(totalPrev6 / Math.max(data.payments.filter((p) => months.includes(p.mes)).length, 1)) : '—'} label="Ticket medio/cobranca" color="var(--p)" />
      </div>

      {/* Receita vs Despesas — barras agrupadas */}
      <Card title="Receita x Despesas — 6 meses">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
          {rvd.map((m) => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'center', height: '88%' }}>
                {/* Previsto (fundo) */}
                <div style={{ flex: 1, background: 'rgba(16,185,129,.15)', borderRadius: '3px 3px 0 0', height: `${Math.max((m.previsto / maxRvd) * 100, m.previsto > 0 ? 3 : 0)}%`, position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#10b981', borderRadius: '3px 3px 0 0', height: `${m.previsto > 0 ? (m.receita / m.previsto) * 100 : 0}%` }} />
                </div>
                {/* Despesas */}
                <div style={{ flex: 1, background: '#ef4444', borderRadius: '3px 3px 0 0', height: `${Math.max((m.despesa / maxRvd) * 100, m.despesa > 0 ? 3 : 0)}%`, opacity: .8 }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {[['rgba(16,185,129,.15)', 'Previsto'], ['#10b981', 'Recebido'], ['#ef4444', 'Despesas']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--t3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Cashflow mensal */}
        <Card title="Resultado mensal — 12 meses">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
            {cashflow.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: `${Math.max((Math.abs(m.resultado) / maxCash) * 100, m.resultado !== 0 ? 3 : 0)}%`, background: m.resultado >= 0 ? '#10b981' : '#ef4444', opacity: .85 }} />
                <div style={{ fontSize: 8, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>Acumulado 12 meses</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: cashflow[cashflow.length - 1]?.acumulado >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCurrency(cashflow[cashflow.length - 1]?.acumulado ?? 0)}
            </span>
          </div>
        </Card>

        {/* Status de cobranças */}
        <Card title="Status de cobranças">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'recebido', label: 'Recebido', color: '#10b981' },
              { key: 'pendente', label: 'Pendente', color: '#f59e0b' },
              { key: 'parcial', label: 'Parcial', color: '#8b5cf6' },
              { key: 'inadimplente', label: 'Inadimplente', color: '#ef4444' },
            ].map(({ key, label, color }) => {
              const count = statusCounts[key as keyof typeof statusCounts];
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 76, fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0 }}>{label}</div>
                  <div style={{ flex: 1, height: 8, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / totalPags) * 100}%`, background: color, borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 22, fontSize: 11, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{count}</div>
                  <div style={{ width: 30, fontSize: 10, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>{Math.round((count / totalPags) * 100)}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Receita por paciente */}
        {byChild.length > 0 && (
          <Card title="Receita por paciente (acumulado)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {byChild.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 110, fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ flex: 1, height: 8, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${((c.receita + c.pendente) / maxChild) * 100}%`, background: 'rgba(245,158,11,.3)', borderRadius: 4 }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(c.receita / maxChild) * 100}%`, background: 'var(--p)', borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 66, fontSize: 11, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{formatCurrency(c.receita)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Despesas por categoria */}
        {byCat.length > 0 ? (
          <Card title="Despesas por categoria (6 meses)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {byCat.map(([cat, val]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat as Despesa['categoria']] ?? '#6b7280', flexShrink: 0 }} />
                  <div style={{ width: 100, fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {CAT_LABELS[cat as Despesa['categoria']] ?? cat}
                  </div>
                  <div style={{ flex: 1, height: 8, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(val / maxCat) * 100}%`, background: CAT_COLORS[cat as Despesa['categoria']] ?? '#6b7280', borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 66, fontSize: 11, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{formatCurrency(val)}</div>
                </div>
              ))}
              <div style={{ paddingTop: 10, borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>Total 6 meses</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#ef4444' }}>{formatCurrency(totalDesp6)}</span>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Despesas por categoria">
            <div style={{ fontSize: 12, color: 'var(--t3)', paddingTop: 10 }}>Nenhuma despesa paga nos ultimos 6 meses</div>
          </Card>
        )}
      </div>

      {/* Resumo executivo */}
      <Card title="Resumo executivo — 6 meses">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {[
            { label: 'Receita total', value: formatCurrency(totalRec6), color: '#10b981' },
            { label: 'Despesas totais', value: formatCurrency(totalDesp6), color: '#ef4444' },
            { label: 'Resultado liquido', value: formatCurrency(resultado6), color: resultado6 >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Margem media', value: `${margem6}%`, color: margem6 >= 30 ? '#10b981' : '#f59e0b' },
            { label: 'Receita media/mes', value: formatCurrency(totalRec6 / 6), color: 'var(--p)' },
            { label: 'Despesa media/mes', value: formatCurrency(totalDesp6 / 6), color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--sf2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── DRE Tab ─────────────────────────────────────────────
function DreTab() {
  const { state } = useApp();
  const { data } = state;
  const months = useMemo(() => getLastNMonths(12), []);
  const [selectedMes, setSelectedMes] = useState(new Date().toISOString().slice(0, 7));

  const dreData = useMemo(() => months.map((m) => {
    const receitas = data.payments
      .filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial'))
      .reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const despesas = data.expenses
      .filter((e) => e.mes === m && e.status === 'pago')
      .reduce((s, e) => s + (e.valor ?? 0), 0);
    return { mes: m, label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3) + '/' + m.slice(2, 4), receitas, despesas, resultado: receitas - despesas };
  }), [months, data.payments, data.expenses]);

  const mesDetail = useMemo(() => {
    const pags = data.payments.filter((p) => p.mes === selectedMes && (p.status === 'recebido' || p.status === 'parcial'));
    const desps = data.expenses.filter((e) => e.mes === selectedMes);
    const receitaTotal = pags.reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const despesaTotal = desps.filter((e) => e.status === 'pago').reduce((s, e) => s + (e.valor ?? 0), 0);
    const despesaPendente = desps.filter((e) => e.status === 'pendente').reduce((s, e) => s + (e.valor ?? 0), 0);
    const byCategory: Record<string, number> = {};
    desps.filter((e) => e.status === 'pago').forEach((e) => { byCategory[e.categoria] = (byCategory[e.categoria] ?? 0) + e.valor; });
    return { receitaTotal, despesaTotal, despesaPendente, resultado: receitaTotal - despesaTotal, byCategory, pags, desps };
  }, [selectedMes, data.payments, data.expenses]);

  const maxBar = Math.max(...dreData.map((d) => Math.max(d.receitas, d.despesas)), 1);

  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = -11; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({ val: d.toISOString().slice(0, 7), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts.reverse();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 18 }}>Resultado — 12 meses (clique para detalhar)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, overflowX: 'auto' }}>
          {dreData.map((d) => (
            <div key={d.mes} style={{ minWidth: 40, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }} onClick={() => setSelectedMes(d.mes)}>
              <div style={{ width: '100%', display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'flex-end', height: '90%' }}>
                <div style={{ flex: 1, background: '#10b981', borderRadius: '3px 3px 0 0', height: `${Math.max((d.receitas / maxBar) * 100, d.receitas > 0 ? 3 : 0)}%`, opacity: selectedMes === d.mes ? 1 : .65 }} />
                <div style={{ flex: 1, background: '#ef4444', borderRadius: '3px 3px 0 0', height: `${Math.max((d.despesas / maxBar) * 100, d.despesas > 0 ? 3 : 0)}%`, opacity: selectedMes === d.mes ? 1 : .65 }} />
              </div>
              <div style={{ fontSize: 9, color: selectedMes === d.mes ? 'var(--p)' : 'var(--t3)', fontWeight: selectedMes === d.mes ? 800 : 600 }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>DRE —</div>
          <select value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)} style={{ padding: '7px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit' }}>
            {monthOptions.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: 13 }}>RECEITAS BRUTAS</div>
              <div style={{ fontWeight: 900, color: '#10b981', fontSize: 18 }}>{formatCurrency(mesDetail.receitaTotal)}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{mesDetail.pags.length} cobranca(s) recebida(s)</div>
          </div>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 13 }}>DESPESAS OPERACIONAIS</div>
              <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 18 }}>({formatCurrency(mesDetail.despesaTotal)})</div>
            </div>
            {Object.keys(mesDetail.byCategory).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Nenhuma despesa paga neste mes</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(mesDetail.byCategory).map(([cat, val]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat as Despesa['categoria']] ?? '#6b7280' }} />
                      <div style={{ fontSize: 13, color: 'var(--t2)' }}>{CAT_LABELS[cat as Despesa['categoria']] ?? cat}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>({formatCurrency(val)})</div>
                  </div>
                ))}
              </div>
            )}
            {mesDetail.despesaPendente > 0 && (
              <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 10 }}>
                + {formatCurrency(mesDetail.despesaPendente)} em despesas pendentes (nao incluido)
              </div>
            )}
          </div>
          <div style={{ padding: '16px 18px', background: mesDetail.resultado >= 0 ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: mesDetail.resultado >= 0 ? '#10b981' : '#ef4444' }}>RESULTADO LIQUIDO</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: mesDetail.resultado >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(mesDetail.resultado)}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>
              Margem: {mesDetail.receitaTotal > 0 ? `${Math.round((mesDetail.resultado / mesDetail.receitaTotal) * 100)}%` : '—'}
            </div>
          </div>
        </div>
      </div>
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
  const [expForm, setExpForm] = useState({ descricao: '', categoria: 'adm' as Despesa['categoria'], valor: '', mes: new Date().toISOString().slice(0, 7), data: '', status: 'pago' as Despesa['status'], recorrente: false, notas: '' });
  const [savingExp, setSavingExp] = useState(false);

  const monthPayments = useMemo(() => data.payments.filter((p) => p.mes === monthFilter), [data.payments, monthFilter]);
  const monthExpenses = useMemo(() => data.expenses.filter((e) => e.mes === monthFilter), [data.expenses, monthFilter]);

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

  function openNewPay() {
    setSelectedPay(null);
    setPayForm({ child_id: '', mes: monthFilter, valor_previsto: '', valor_recebido: '0', status: 'pendente' });
    setShowPayModal(true);
  }

  function openEditPay(p: Pagamento) {
    setSelectedPay(p);
    setPayForm({ child_id: String(p.child_id), mes: p.mes, valor_previsto: String(p.valor_previsto ?? ''), valor_recebido: String(p.valor_recebido ?? 0), status: p.status });
    setShowPayModal(true);
  }

  async function handleSavePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payForm.child_id) return;
    setSavingPay(true); setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload = { clinic_id: state.user?.clinicId, child_id: Number(payForm.child_id), mes: payForm.mes, valor_previsto: Number(payForm.valor_previsto), valor_recebido: Number(payForm.valor_recebido), status: payForm.status, data_pag: payForm.status === 'recebido' ? new Date().toISOString().slice(0, 10) : null };
      if (selectedPay) {
        const { data: upd, error } = await supabase.from('pagamentos').update(payload).eq('id', selectedPay.id).select().single();
        if (error) { setSaveError([error.message, error.details].filter(Boolean).join(' | ')); return; }
        if (upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
      } else {
        const { data: created, error } = await supabase.from('pagamentos').insert(payload).select().single();
        if (error) { setSaveError([error.message, error.details].filter(Boolean).join(' | ')); return; }
        if (created) dispatch({ type: 'ADD_PAYMENT', payload: created });
      }
      setShowPayModal(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSavingPay(false); }
  }

  async function markReceived(p: Pagamento) {
    const { supabase } = await import('@/lib/supabase');
    const { data: upd } = await supabase.from('pagamentos').update({ status: 'recebido', valor_recebido: p.valor_previsto, data_pag: new Date().toISOString().slice(0, 10) }).eq('id', p.id).select().single();
    if (upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
  }

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault();
    if (!contractForm.child_id) return;
    setSavingContract(true); setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload: Partial<Contrato> = { clinic_id: state.user?.clinicId, child_id: Number(contractForm.child_id), tipo: contractForm.tipo, convenio: contractForm.tipo === 'convenio' ? contractForm.convenio || null : null, valor_sessao: Number(contractForm.valor_sessao) || null, sessoes_semanais: Number(contractForm.sessoes_semanais) || null, duracao_min: Number(contractForm.duracao_min) || null, dia_vencimento: Number(contractForm.dia_vencimento) || null, status: contractForm.status as Contrato['status'] };
      const { data: created, error } = await supabase.from('contratos').insert(payload).select().single();
      if (error) { setSaveError([error.message, error.details, error.hint].filter(Boolean).join(' | ')); return; }
      if (created) dispatch({ type: 'ADD_CONTRACT', payload: created });
      setShowContractModal(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally { setSavingContract(false); }
  }

  // FIX: usa contrato_id para diferenciar pagamentos de contratos diferentes do mesmo paciente
  async function darBaixaContrato(c: Contrato) {
    const mes = monthFilter;
    const valorMensal = (c.valor_sessao ?? 0) * (c.sessoes_semanais ?? 0) * 4;
    const { supabase } = await import('@/lib/supabase');
    const existing = data.payments.find((p) => p.contrato_id === c.id && p.mes === mes);
    if (existing) {
      const { data: upd } = await supabase.from('pagamentos')
        .update({ status: 'recebido', valor_recebido: valorMensal, data_pag: new Date().toISOString().slice(0, 10) })
        .eq('id', existing.id).select().single();
      if (upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
    } else {
      const { data: created } = await supabase.from('pagamentos')
        .insert({ clinic_id: state.user?.clinicId, child_id: c.child_id, contrato_id: c.id, mes, valor_previsto: valorMensal, valor_recebido: valorMensal, status: 'recebido', data_pag: new Date().toISOString().slice(0, 10) })
        .select().single();
      if (created) dispatch({ type: 'ADD_PAYMENT', payload: created });
    }
  }

  function openNewExp() {
    setSelectedExp(null);
    setExpForm({ descricao: '', categoria: 'adm', valor: '', mes: monthFilter, data: '', status: 'pago', recorrente: false, notas: '' });
    setShowExpModal(true);
  }

  function openEditExp(e: Despesa) {
    setSelectedExp(e);
    setExpForm({ descricao: e.descricao, categoria: e.categoria, valor: String(e.valor), mes: e.mes, data: e.data ?? '', status: e.status, recorrente: e.recorrente, notas: e.notas ?? '' });
    setShowExpModal(true);
  }

  async function darBaixaDespesa(e: Despesa) {
    const { supabase } = await import('@/lib/supabase');
    const { data: upd } = await supabase.from('despesas')
      .update({ status: 'pago', data: e.data || new Date().toISOString().slice(0, 10) })
      .eq('id', e.id).select().single();
    if (upd) dispatch({ type: 'UPDATE_EXPENSE', payload: upd });
  }

  async function handleSaveExp(e: React.FormEvent) {
    e.preventDefault();
    if (!expForm.descricao || !expForm.valor) return;
    setSavingExp(true); setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload = { clinic_id: state.user?.clinicId, descricao: expForm.descricao, categoria: expForm.categoria, valor: Number(expForm.valor), mes: expForm.mes, data: expForm.data || null, status: expForm.status, recorrente: expForm.recorrente, notas: expForm.notas || null };
      if (selectedExp) {
        const { data: upd, error } = await supabase.from('despesas').update(payload).eq('id', selectedExp.id).select().single();
        if (error) { setSaveError([error.message, error.details].filter(Boolean).join(' | ')); return; }
        if (upd) dispatch({ type: 'UPDATE_EXPENSE', payload: upd });
      } else {
        const { data: created, error } = await supabase.from('despesas').insert(payload).select().single();
        if (error) { setSaveError([error.message, error.details].filter(Boolean).join(' | ')); return; }
        if (created) dispatch({ type: 'ADD_EXPENSE', payload: created });
      }
      setShowExpModal(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSavingExp(false); }
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
    { key: 'relatorios', label: 'Relatorios' },
  ];

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div className="view show" id="v-financeiro">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Financeiro</div>
          <h1 className="ph-title">Financeiro ERP</h1>
          <div className="ph-sub">Pagamentos · Contratos · Despesas · DRE</div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: 10, marginBottom: 22 }}>
          {[
            { label: 'Recebido', value: formatCurrency(stats.recebido), color: '#10b981' },
            { label: 'Pendente', value: formatCurrency(stats.pendente), color: '#f59e0b' },
            { label: 'Despesas pagas', value: formatCurrency(stats.despesas), color: '#ef4444' },
            { label: 'Resultado', value: formatCurrency(stats.resultado), color: stats.resultado >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Previsto total', value: formatCurrency(stats.previsto), color: 'var(--p)' },
            { label: 'Cobranças', value: stats.count, color: 'var(--v)' },
          ].map((k) => (
            <div key={k.label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '14px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '1px solid var(--bdr)', overflowX: 'auto' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 16px', border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--p)' : 'transparent'}`, background: 'none', color: tab === key ? 'var(--p)' : 'var(--t2)', fontWeight: tab === key ? 700 : 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Month filter */}
        {(tab === 'pagamentos' || tab === 'contratos' || tab === 'despesas') && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit' }}>
              {monthOptions.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            {tab === 'pagamentos' && <button className="btn-p" onClick={openNewPay} style={{ marginLeft: 'auto' }}>+ Cobrar pagamento</button>}
            {tab === 'despesas' && <button className="btn-p" onClick={openNewExp} style={{ marginLeft: 'auto' }}>+ Nova despesa</button>}
            {tab === 'contratos' && <button className="btn-p" onClick={() => { setSaveError(null); setShowContractModal(true); }} style={{ marginLeft: 'auto' }}>+ Novo contrato</button>}
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
                  {p.status === 'pendente' && (
                    <button onClick={() => markReceived(p)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Dar baixa</button>
                  )}
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
              // FIX: busca pelo contrato_id especifico, nao pelo child_id
              const pagMes = data.payments.find((p) => p.contrato_id === c.id && p.mes === monthFilter);
              const jaBaixado = pagMes?.status === 'recebido' || pagMes?.status === 'parcial';
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{childName(c.child_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {c.sessoes_semanais}x/sem · Vto dia {c.dia_vencimento} · {c.tipo ?? 'particular'}
                      {valorMensal > 0 && ` · Mensal: ${formatCurrency(valorMensal)}`}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>
                    {formatCurrency(c.valor_sessao ?? 0)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>/sessao</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: c.status === 'ativo' ? 'rgba(16,185,129,.12)' : 'var(--sf2)', color: c.status === 'ativo' ? '#10b981' : 'var(--t3)' }}>{c.status}</span>
                  {c.status === 'ativo' && (
                    jaBaixado
                      ? <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>Recebido em {monthFilter}</span>
                      : <button onClick={() => darBaixaContrato(c)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Dar baixa</button>
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
                  <div style={{ width: 6, height: 36, borderRadius: 3, background: CAT_COLORS[e.categoria] ?? '#6b7280', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{e.descricao}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {CAT_LABELS[e.categoria]}{e.recorrente ? ' · Recorrente' : ''}{e.data ? ` · ${e.data}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{formatCurrency(e.valor)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20 }}>{statusLabel[e.status]}</span>
                  {e.status === 'pendente' && (
                    <button onClick={() => darBaixaDespesa(e)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Dar baixa</button>
                  )}
                  <button onClick={() => openEditExp(e)} style={{ background: 'none', border: '1px solid var(--bdr)', borderRadius: 8, padding: '6px 10px', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                  <button onClick={() => deleteExp(e.id)} style={{ background: 'none', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '6px 10px', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                </div>
              );
            })}
            {monthExpenses.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>Total pagas no mes</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#ef4444' }}>{formatCurrency(stats.despesas)}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'dre' && <DreTab />}
        {tab === 'relatorios' && <BiFinanceiro />}
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
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Paciente *</label>
                <select value={payForm.child_id} onChange={(e) => setPayForm(f => ({ ...f, child_id: e.target.value }))} required style={inputStyle}>
                  <option value="">Selecione...</option>
                  {data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Mes ref.</label>
                  <input type="month" value={payForm.mes} onChange={(e) => setPayForm(f => ({ ...f, mes: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor previsto (R$)</label>
                  <input type="number" value={payForm.valor_previsto} onChange={(e) => setPayForm(f => ({ ...f, valor_previsto: e.target.value }))} required min="0" step="0.01" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={payForm.status} onChange={(e) => setPayForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    <option value="pendente">Pendente</option>
                    <option value="recebido">Recebido</option>
                    <option value="parcial">Parcial</option>
                    <option value="inadimplente">Inadimplente</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor recebido (R$)</label>
                  <input type="number" value={payForm.valor_recebido} onChange={(e) => setPayForm(f => ({ ...f, valor_recebido: e.target.value }))} min="0" step="0.01" style={inputStyle} />
                </div>
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
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Paciente *</label>
                <select value={contractForm.child_id} onChange={(e) => setContractForm(f => ({ ...f, child_id: e.target.value }))} required style={inputStyle}>
                  <option value="">Selecione...</option>
                  {data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Tipo</label>
                  <select value={contractForm.tipo} onChange={(e) => setContractForm(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                    <option value="particular">Particular</option>
                    <option value="convenio">Convenio</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor/sessao (R$)</label>
                  <input type="number" value={contractForm.valor_sessao} onChange={(e) => setContractForm(f => ({ ...f, valor_sessao: e.target.value }))} min="0" step="0.01" style={inputStyle} />
                </div>
              </div>
              {contractForm.tipo === 'convenio' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Convenio</label>
                  <input value={contractForm.convenio} onChange={(e) => setContractForm(f => ({ ...f, convenio: e.target.value }))} placeholder="Nome do convenio" style={inputStyle} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Sessoes/sem</label>
                  <input type="number" value={contractForm.sessoes_semanais} onChange={(e) => setContractForm(f => ({ ...f, sessoes_semanais: e.target.value }))} min="1" max="30" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Duracao (min)</label>
                  <input type="number" value={contractForm.duracao_min} onChange={(e) => setContractForm(f => ({ ...f, duracao_min: e.target.value }))} min="15" max="240" step="5" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Vto. dia</label>
                  <input type="number" value={contractForm.dia_vencimento} onChange={(e) => setContractForm(f => ({ ...f, dia_vencimento: e.target.value }))} min="1" max="31" style={inputStyle} />
                </div>
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
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Descricao *</label>
                <input value={expForm.descricao} onChange={(e) => setExpForm(f => ({ ...f, descricao: e.target.value }))} required placeholder="Ex: Aluguel sala" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Categoria</label>
                  <select value={expForm.categoria} onChange={(e) => setExpForm(f => ({ ...f, categoria: e.target.value as Despesa['categoria'] }))} style={inputStyle}>
                    {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor (R$) *</label>
                  <input type="number" value={expForm.valor} onChange={(e) => setExpForm(f => ({ ...f, valor: e.target.value }))} required min="0" step="0.01" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Mes ref.</label>
                  <input type="month" value={expForm.mes} onChange={(e) => setExpForm(f => ({ ...f, mes: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Data pagamento</label>
                  <input type="date" value={expForm.data} onChange={(e) => setExpForm(f => ({ ...f, data: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={expForm.status} onChange={(e) => setExpForm(f => ({ ...f, status: e.target.value as Despesa['status'] }))} style={inputStyle}>
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
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
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Notas</label>
                <textarea value={expForm.notas} onChange={(e) => setExpForm(f => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Observacoes..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              {saveError && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}><strong>Erro:</strong> {saveError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowExpModal(false)} style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={savingExp} className="btn-p" style={{ flex: 2 }}>{savingExp ? 'Salvando...' : selectedExp ? 'Salvar' : 'Lancar despesa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
