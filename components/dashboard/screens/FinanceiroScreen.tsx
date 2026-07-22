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

// ─── BiFinanceiro ────────────────────────────────────────
function BiFinanceiro() {
  const { state } = useApp();
  const { data } = state;
  const months = useMemo(() => getLastNMonths(6), []);

  const revenueByMonth = useMemo(() => months.map((m) => ({
    label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3),
    recebido: data.payments.filter((p) => p.mes === m && (p.status === 'recebido' || p.status === 'parcial')).reduce((s, p) => s + (p.valor_recebido ?? 0), 0),
    previsto: data.payments.filter((p) => p.mes === m).reduce((s, p) => s + (p.valor_previsto ?? 0), 0),
  })), [months, data.payments]);

  const maxRevenue = Math.max(...revenueByMonth.map((m) => m.previsto), 1);
  const totalRecebido = revenueByMonth.reduce((s, m) => s + m.recebido, 0);
  const totalPrevisto = revenueByMonth.reduce((s, m) => s + m.previsto, 0);
  const totalPendente = data.payments.filter((p) => p.status === 'pendente').reduce((s, p) => s + (p.valor_previsto ?? 0), 0);
  const inadimplentes = data.payments.filter((p) => p.status === 'inadimplente').length;
  const taxaRecebimento = totalPrevisto > 0 ? Math.round((totalRecebido / totalPrevisto) * 100) : 0;

  const revenueByChild = useMemo(() => {
    const map: Record<number, { name: string; recebido: number }> = {};
    data.payments.forEach((p) => {
      const child = data.children.find((c) => c.id === p.child_id);
      if (!map[p.child_id]) map[p.child_id] = { name: child?.name ?? `Paciente ${p.child_id}`, recebido: 0 };
      if (p.status === 'recebido' || p.status === 'parcial') map[p.child_id].recebido += p.valor_recebido ?? 0;
    });
    return Object.values(map).sort((a, b) => b.recebido - a.recebido).slice(0, 8);
  }, [data.payments, data.children]);

  const maxChildRevenue = Math.max(...revenueByChild.map((c) => c.recebido), 1);

  const statusCounts = useMemo(() => {
    const counts = { recebido: 0, pendente: 0, inadimplente: 0, parcial: 0 };
    data.payments.forEach((p) => { if (p.status in counts) counts[p.status as keyof typeof counts]++; });
    return counts;
  }, [data.payments]);

  const totalPags = Object.values(statusCounts).reduce((s, v) => s + v, 0) || 1;

  function KpiCard({ value, label, color }: { value: string | number; label: string; color: string }) {
    return (
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginTop: 6 }}>{label}</div>
      </div>
    );
  }

  function SCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px', ...style }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 18 }}>{title}</div>
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 12 }}>
        <KpiCard value={formatCurrency(totalRecebido)} label="Recebido (6 meses)" color="#10b981" />
        <KpiCard value={formatCurrency(totalPrevisto)} label="Previsto (6 meses)" color="var(--p)" />
        <KpiCard value={formatCurrency(totalPendente)} label="Em aberto" color="#f59e0b" />
        <KpiCard value={`${taxaRecebimento}%`} label="Taxa de recebimento" color={taxaRecebimento >= 80 ? '#10b981' : '#f59e0b'} />
        <KpiCard value={inadimplentes} label="Inadimplentes" color="#ef4444" />
        <KpiCard value={data.children.filter((c) => c.status === 'ativo').length} label="Pacientes ativos" color="var(--v)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SCard title="Receita mensal (6 meses)">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130 }}>
            {revenueByMonth.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 600 }}>{m.recebido > 0 ? `R$${Math.round(m.recebido / 1000)}k` : ''}</div>
                <div style={{ width: '100%', position: 'relative', borderRadius: '4px 4px 0 0', height: `${Math.max((m.previsto / maxRevenue) * 100, 4)}%` }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'var(--sf2)', borderRadius: '4px 4px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(m.previsto > 0 ? m.recebido / m.previsto : 0) * 100}%`, background: '#10b981', borderRadius: '4px 4px 0 0' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </SCard>

        <SCard title="Status de cobranças">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'recebido', label: 'Recebido', color: '#10b981' },
              { key: 'pendente', label: 'Pendente', color: '#f59e0b' },
              { key: 'parcial', label: 'Parcial', color: '#8b5cf6' },
              { key: 'inadimplente', label: 'Inadimplente', color: '#ef4444' },
            ].map(({ key, label, color }) => {
              const count = statusCounts[key as keyof typeof statusCounts];
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0 }}>{label}</div>
                  <div style={{ flex: 1, height: 10, background: 'var(--sf2)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / totalPags) * 100}%`, background: color, borderRadius: 5 }} />
                  </div>
                  <div style={{ width: 28, fontSize: 12, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{count}</div>
                  <div style={{ width: 34, fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>{Math.round((count / totalPags) * 100)}%</div>
                </div>
              );
            })}
          </div>
        </SCard>
      </div>

      {revenueByChild.length > 0 && (
        <SCard title="Receita por paciente (acumulado)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {revenueByChild.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 130, fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ flex: 1, height: 10, background: 'var(--sf2)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max((c.recebido / maxChildRevenue) * 100, c.recebido > 0 ? 2 : 0)}%`, background: 'var(--p)', borderRadius: 5 }} />
                </div>
                <div style={{ width: 72, fontSize: 12, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{formatCurrency(c.recebido)}</div>
              </div>
            ))}
          </div>
        </SCard>
      )}
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
    const resultado = receitas - despesas;
    return { mes: m, label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3) + '/' + m.slice(2, 4), receitas, despesas, resultado };
  }), [months, data.payments, data.expenses]);

  const mesDetail = useMemo(() => {
    const pags = data.payments.filter((p) => p.mes === selectedMes && (p.status === 'recebido' || p.status === 'parcial'));
    const desps = data.expenses.filter((e) => e.mes === selectedMes);

    const receitaTotal = pags.reduce((s, p) => s + (p.valor_recebido ?? 0), 0);
    const despesaTotal = desps.filter((e) => e.status === 'pago').reduce((s, e) => s + (e.valor ?? 0), 0);
    const despesaPendente = desps.filter((e) => e.status === 'pendente').reduce((s, e) => s + (e.valor ?? 0), 0);

    const byCategory: Record<string, number> = {};
    desps.filter((e) => e.status === 'pago').forEach((e) => {
      byCategory[e.categoria] = (byCategory[e.categoria] ?? 0) + e.valor;
    });

    return { receitaTotal, despesaTotal, despesaPendente, resultado: receitaTotal - despesaTotal, byCategory, pags, desps };
  }, [selectedMes, data.payments, data.expenses]);

  const maxBar = Math.max(...dreData.map((d) => Math.max(d.receitas, d.despesas)), 1);

  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = -11; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = d.toISOString().slice(0, 7);
      opts.push({ val, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts.reverse();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* DRE gráfico 12 meses */}
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 18 }}>Resultado — 12 meses</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, overflowX: 'auto' }}>
          {dreData.map((d) => (
            <div key={d.mes} style={{ minWidth: 40, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }} onClick={() => setSelectedMes(d.mes)}>
              <div style={{ width: '100%', display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'flex-end', height: '90%' }}>
                <div style={{ flex: 1, background: '#10b981', borderRadius: '3px 3px 0 0', height: `${Math.max((d.receitas / maxBar) * 100, d.receitas > 0 ? 3 : 0)}%`, opacity: selectedMes === d.mes ? 1 : .7 }} />
                <div style={{ flex: 1, background: '#ef4444', borderRadius: '3px 3px 0 0', height: `${Math.max((d.despesas / maxBar) * 100, d.despesas > 0 ? 3 : 0)}%`, opacity: selectedMes === d.mes ? 1 : .7 }} />
              </div>
              <div style={{ fontSize: 9, color: selectedMes === d.mes ? 'var(--p)' : 'var(--t3)', fontWeight: selectedMes === d.mes ? 800 : 600 }}>{d.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
          {[['#10b981', 'Receitas'], ['#ef4444', 'Despesas']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--t3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 'auto' }}>Clique no mês para detalhar</div>
        </div>
      </div>

      {/* DRE detalhe do mês selecionado */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>DRE —</div>
          <select value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)} style={{ padding: '7px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit' }}>
            {monthOptions.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          {/* Receitas */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: 13 }}>RECEITAS BRUTAS</div>
              <div style={{ fontWeight: 900, color: '#10b981', fontSize: 18 }}>{formatCurrency(mesDetail.receitaTotal)}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>
              Pagamentos recebidos/parciais de {mesDetail.pags.length} cobrança(s)
            </div>
          </div>

          {/* Despesas por categoria */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 13 }}>DESPESAS OPERACIONAIS</div>
              <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 18 }}>({formatCurrency(mesDetail.despesaTotal)})</div>
            </div>
            {Object.keys(mesDetail.byCategory).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Nenhuma despesa paga neste mês</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(mesDetail.byCategory).map(([cat, val]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat as Despesa['categoria']] ?? '#6b7280', flexShrink: 0 }} />
                      <div style={{ fontSize: 13, color: 'var(--t2)' }}>{CAT_LABELS[cat as Despesa['categoria']] ?? cat}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>({formatCurrency(val)})</div>
                  </div>
                ))}
              </div>
            )}
            {mesDetail.despesaPendente > 0 && (
              <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 10 }}>
                + {formatCurrency(mesDetail.despesaPendente)} em despesas pendentes (não incluido no resultado)
              </div>
            )}
          </div>

          {/* Resultado */}
          <div style={{ padding: '16px 18px', background: mesDetail.resultado >= 0 ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: mesDetail.resultado >= 0 ? '#10b981' : '#ef4444' }}>
                RESULTADO LIQUIDO DO PERIODO
              </div>
              <div style={{ fontWeight: 900, fontSize: 22, color: mesDetail.resultado >= 0 ? '#10b981' : '#ef4444' }}>
                {formatCurrency(mesDetail.resultado)}
              </div>
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

  // Payment state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPay, setSelectedPay] = useState<Pagamento | null>(null);
  const [payForm, setPayForm] = useState({ child_id: '', mes: new Date().toISOString().slice(0, 7), valor_previsto: '', valor_recebido: '0', status: 'pendente' });
  const [savingPay, setSavingPay] = useState(false);

  // Contract state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ child_id: '', tipo: 'particular', convenio: '', valor_sessao: '', sessoes_semanais: '5', duracao_min: '50', dia_vencimento: '5', status: 'ativo' });
  const [savingContract, setSavingContract] = useState(false);

  // Expense state
  const [showExpModal, setShowExpModal] = useState(false);
  const [selectedExp, setSelectedExp] = useState<Despesa | null>(null);
  const [expForm, setExpForm] = useState({ descricao: '', categoria: 'adm' as Despesa['categoria'], valor: '', mes: new Date().toISOString().slice(0, 7), data: '', status: 'pago' as Despesa['status'], recorrente: false, notas: '' });
  const [savingExp, setSavingExp] = useState(false);

  const monthPayments = useMemo(() => data.payments.filter((p) => !monthFilter || p.mes === monthFilter), [data.payments, monthFilter]);
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
      const val = d.toISOString().slice(0, 7);
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      opts.push({ val, label });
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
    setSavingPay(true);
    setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload = {
        clinic_id: state.user?.clinicId,
        child_id: Number(payForm.child_id),
        mes: payForm.mes,
        valor_previsto: Number(payForm.valor_previsto),
        valor_recebido: Number(payForm.valor_recebido),
        status: payForm.status,
        data_pag: payForm.status === 'recebido' ? new Date().toISOString().slice(0, 10) : null,
      };
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
    } finally {
      setSavingPay(false);
    }
  }

  async function markReceived(p: Pagamento) {
    const { supabase } = await import('@/lib/supabase');
    const { data: upd } = await supabase.from('pagamentos').update({ status: 'recebido', valor_recebido: p.valor_previsto, data_pag: new Date().toISOString().slice(0, 10) }).eq('id', p.id).select().single();
    if (upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
  }

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault();
    if (!contractForm.child_id) return;
    setSavingContract(true);
    setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload: Partial<Contrato> = {
        clinic_id: state.user?.clinicId,
        child_id: Number(contractForm.child_id),
        tipo: contractForm.tipo,
        convenio: contractForm.tipo === 'convenio' ? contractForm.convenio || null : null,
        valor_sessao: Number(contractForm.valor_sessao) || null,
        sessoes_semanais: Number(contractForm.sessoes_semanais) || null,
        duracao_min: Number(contractForm.duracao_min) || null,
        dia_vencimento: Number(contractForm.dia_vencimento) || null,
        status: contractForm.status as Contrato['status'],
      };
      const { data: created, error } = await supabase.from('contratos').insert(payload).select().single();
      if (error) { setSaveError([error.message, error.details, error.hint].filter(Boolean).join(' | ')); return; }
      if (created) dispatch({ type: 'ADD_CONTRACT', payload: created });
      setShowContractModal(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setSavingContract(false);
    }
  }

  async function darBaixaContrato(c: Contrato) {
    const mes = monthFilter;
    const valorMensal = (c.valor_sessao ?? 0) * (c.sessoes_semanais ?? 0) * 4;
    const { supabase } = await import('@/lib/supabase');
    const existing = data.payments.find((p) => p.child_id === c.child_id && p.mes === mes);
    if (existing) {
      const { data: upd } = await supabase.from('pagamentos')
        .update({ status: 'recebido', valor_recebido: valorMensal, data_pag: new Date().toISOString().slice(0, 10) })
        .eq('id', existing.id).select().single();
      if (upd) dispatch({ type: 'UPDATE_PAYMENT', payload: upd });
    } else {
      const { data: created } = await supabase.from('pagamentos')
        .insert({ clinic_id: state.user?.clinicId, child_id: c.child_id, mes, valor_previsto: valorMensal, valor_recebido: valorMensal, status: 'recebido', data_pag: new Date().toISOString().slice(0, 10) })
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

  async function handleSaveExp(e: React.FormEvent) {
    e.preventDefault();
    if (!expForm.descricao || !expForm.valor) return;
    setSavingExp(true);
    setSaveError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const payload = {
        clinic_id: state.user?.clinicId,
        descricao: expForm.descricao,
        categoria: expForm.categoria,
        valor: Number(expForm.valor),
        mes: expForm.mes,
        data: expForm.data || null,
        status: expForm.status,
        recorrente: expForm.recorrente,
        notas: expForm.notas || null,
      };
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
    } finally {
      setSavingExp(false);
    }
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

  const statusLabel: Record<string, string> = {
    recebido: 'Recebido', pendente: 'Pendente', inadimplente: 'Inadimplente', parcial: 'Parcial', pago: 'Pago',
  };

  const TABS: { key: TabType; label: string }[] = [
    { key: 'pagamentos', label: 'Pagamentos' },
    { key: 'contratos',  label: 'Contratos' },
    { key: 'despesas',   label: 'Despesas' },
    { key: 'dre',        label: 'DRE' },
    { key: 'relatorios', label: 'Relatorios' },
  ];

  return (
    <div className="view show" id="v-financeiro">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Financeiro</div>
          <h1 className="ph-title">Financeiro ERP</h1>
          <div className="ph-sub">Pagamentos · Contratos · Despesas · DRE</div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Recebido', value: formatCurrency(stats.recebido), color: '#10b981' },
            { label: 'Pendente', value: formatCurrency(stats.pendente), color: '#f59e0b' },
            { label: 'Despesas pagas', value: formatCurrency(stats.despesas), color: '#ef4444' },
            { label: 'Resultado', value: formatCurrency(stats.resultado), color: stats.resultado >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Previsto total', value: formatCurrency(stats.previsto), color: 'var(--p)' },
            { label: 'Cobranças', value: stats.count, color: 'var(--v)' },
          ].map((k) => (
            <div key={k.label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '16px 14px' }}>
              <div style={{ fontSize: 19, fontWeight: 900, color: k.color }}>{k.value}</div>
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

        {/* Month filter for pagamentos/contratos/despesas */}
        {(tab === 'pagamentos' || tab === 'contratos' || tab === 'despesas') && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit' }}>
              {monthOptions.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            {tab === 'pagamentos' && <button className="btn-p" onClick={openNewPay} style={{ marginLeft: 'auto' }}>+ Cobrar pagamento</button>}
            {tab === 'despesas' && <button className="btn-p" onClick={openNewExp} style={{ marginLeft: 'auto' }}>+ Nova despesa</button>}
            {tab === 'contratos' && <button className="btn-p" onClick={() => setShowContractModal(true)} style={{ marginLeft: 'auto' }}>+ Novo contrato</button>}
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
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{childName(p.child_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>{p.mes} · Previsto: {formatCurrency(p.valor_previsto)}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{formatCurrency(p.valor_recebido)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {statusLabel[p.status] ?? p.status}
                  </span>
                  {p.status === 'pendente' && (
                    <button onClick={() => markReceived(p)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Dar baixa</button>
                  )}
                  <button onClick={() => openEditPay(p)} style={{ background: 'none', border: '1px solid var(--bdr)', borderRadius: 8, padding: '6px 10px', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Editar</button>
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
              const pagMes = data.payments.find((p) => p.child_id === c.child_id && p.mes === monthFilter);
              const jaBaixado = pagMes?.status === 'recebido' || pagMes?.status === 'parcial';
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{childName(c.child_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {c.sessoes_semanais}x/sem · Vto dia {c.dia_vencimento} · {c.tipo ?? 'particular'}
                      {valorMensal > 0 && ` · Mensal: ${formatCurrency(valorMensal)}`}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>
                    {formatCurrency(c.valor_sessao ?? 0)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>/sessao</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: c.status === 'ativo' ? 'rgba(16,185,129,.12)' : 'var(--sf2)', color: c.status === 'ativo' ? '#10b981' : 'var(--t3)' }}>
                    {c.status}
                  </span>
                  {c.status === 'ativo' && (
                    jaBaixado ? (
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>Recebido</span>
                    ) : (
                      <button onClick={() => darBaixaContrato(c)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Dar baixa</button>
                    )
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
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12 }}>
                  <div style={{ width: 8, height: 36, borderRadius: 4, background: CAT_COLORS[e.categoria] ?? '#6b7280', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{e.descricao}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {CAT_LABELS[e.categoria]} {e.recorrente && '· Recorrente'} {e.data && `· ${e.data}`}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{formatCurrency(e.valor)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20 }}>
                    {statusLabel[e.status]}
                  </span>
                  <button onClick={() => openEditExp(e)} style={{ background: 'none', border: '1px solid var(--bdr)', borderRadius: 8, padding: '6px 10px', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                  <button onClick={() => deleteExp(e.id)} style={{ background: 'none', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '6px 10px', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                </div>
              );
            })}
            {monthExpenses.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>Total pagas</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#ef4444' }}>{formatCurrency(monthExpenses.filter((e) => e.status === 'pago').reduce((s, e) => s + e.valor, 0))}</div>
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
                <select value={payForm.child_id} onChange={(e) => setPayForm(f => ({ ...f, child_id: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                  <option value="">Selecione...</option>
                  {data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Mes ref.</label>
                  <input type="month" value={payForm.mes} onChange={(e) => setPayForm(f => ({ ...f, mes: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor previsto (R$)</label>
                  <input type="number" value={payForm.valor_previsto} onChange={(e) => setPayForm(f => ({ ...f, valor_previsto: e.target.value }))} required min="0" step="0.01" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={payForm.status} onChange={(e) => setPayForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                    <option value="pendente">Pendente</option>
                    <option value="recebido">Recebido</option>
                    <option value="parcial">Parcial</option>
                    <option value="inadimplente">Inadimplente</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor recebido (R$)</label>
                  <input type="number" value={payForm.valor_recebido} onChange={(e) => setPayForm(f => ({ ...f, valor_recebido: e.target.value }))} min="0" step="0.01" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
                <select value={contractForm.child_id} onChange={(e) => setContractForm(f => ({ ...f, child_id: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                  <option value="">Selecione...</option>
                  {data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Tipo</label>
                  <select value={contractForm.tipo} onChange={(e) => setContractForm(f => ({ ...f, tipo: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                    <option value="particular">Particular</option>
                    <option value="convenio">Convenio</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor/sessao (R$)</label>
                  <input type="number" value={contractForm.valor_sessao} onChange={(e) => setContractForm(f => ({ ...f, valor_sessao: e.target.value }))} min="0" step="0.01" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
              {contractForm.tipo === 'convenio' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Convenio</label>
                  <input value={contractForm.convenio} onChange={(e) => setContractForm(f => ({ ...f, convenio: e.target.value }))} placeholder="Nome do convenio" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Sessoes/semana</label>
                  <input type="number" value={contractForm.sessoes_semanais} onChange={(e) => setContractForm(f => ({ ...f, sessoes_semanais: e.target.value }))} min="1" max="30" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Duracao (min)</label>
                  <input type="number" value={contractForm.duracao_min} onChange={(e) => setContractForm(f => ({ ...f, duracao_min: e.target.value }))} min="15" max="240" step="5" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Vto. dia</label>
                  <input type="number" value={contractForm.dia_vencimento} onChange={(e) => setContractForm(f => ({ ...f, dia_vencimento: e.target.value }))} min="1" max="31" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
                <input value={expForm.descricao} onChange={(e) => setExpForm(f => ({ ...f, descricao: e.target.value }))} required placeholder="Ex: Aluguel sala" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Categoria</label>
                  <select value={expForm.categoria} onChange={(e) => setExpForm(f => ({ ...f, categoria: e.target.value as Despesa['categoria'] }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                    {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Valor (R$) *</label>
                  <input type="number" value={expForm.valor} onChange={(e) => setExpForm(f => ({ ...f, valor: e.target.value }))} required min="0" step="0.01" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Mes ref.</label>
                  <input type="month" value={expForm.mes} onChange={(e) => setExpForm(f => ({ ...f, mes: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Data pagamento</label>
                  <input type="date" value={expForm.data} onChange={(e) => setExpForm(f => ({ ...f, data: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={expForm.status} onChange={(e) => setExpForm(f => ({ ...f, status: e.target.value as Despesa['status'] }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--t2)', fontWeight: 600 }}>
                    <input type="checkbox" checked={expForm.recorrente} onChange={(e) => setExpForm(f => ({ ...f, recorrente: e.target.checked }))} />
                    Recorrente mensal
                  </label>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Notas</label>
                <textarea value={expForm.notas} onChange={(e) => setExpForm(f => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Observacoes..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
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
