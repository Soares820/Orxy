'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getLastNMonths, MONTH_NAMES, todayLocalISO, toLocalISODate, currentMonthLocal } from '@/lib/utils';

type BiTab = 'evolucao' | 'clinica';

function pctColor(p: number) { return p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'; }

function SparkBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ flex: 1, borderRadius: '3px 3px 0 0', height: `${Math.max(pct, 4)}%`, background: color, transition: 'height .3s ease' }} />
  );
}

function Kpi({ value, label, color, sub, accent }: { value: string | number; label: string; color: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--sf)', border: `1px solid var(--bdr)`, borderRadius: 'var(--r)', padding: '18px 16px', borderTop: `3px solid ${accent || color}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, fontWeight: 700, opacity: .75 }}>{sub}</div>}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Card({ title, badge, children, style }: { title: string; badge?: string | number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '20px 18px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', flex: 1 }}>{title}</div>
        {badge !== undefined && (
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--p)', background: 'var(--ps)', borderRadius: 20, padding: '3px 10px' }}>{badge}</div>
        )}
      </div>
      {children}
    </div>
  );
}

// ═══ PAINEL CLÍNICO (clinic-wide analytics) ══════════════
function BiClinica() {
  const { state } = useApp();
  const { data } = state;

  const months6 = useMemo(() => getLastNMonths(6), []);
  const currentMonth = useMemo(() => currentMonthLocal(), []);

  // ── KPIs ──────────────────────────────────────────────
  const kpis = useMemo(() => {
    const sessoesMes = data.sessions.filter((s) => s.data?.startsWith(currentMonth));
    const realizadas = sessoesMes.filter((s) => s.status === 'realizado').length;
    const faltas = sessoesMes.filter((s) => s.status === 'falta' || s.status === 'cancelado').length;
    const totalMes = sessoesMes.length;
    const presenca = totalMes > 0 ? Math.round((realizadas / totalMes) * 100) : 0;
    const absenteismo = totalMes > 0 ? Math.round((faltas / totalMes) * 100) : 0;
    const pacientesAtivos = data.children.filter((c) => c.status === 'ativo').length;

    // Média semanal últimos 3 meses
    const last3m = getLastNMonths(3);
    const s3m = data.sessions.filter((s) => last3m.includes(s.data?.slice(0, 7)));
    const semanas = 13;
    const mediaSemanais = Math.round(s3m.filter((s) => s.status === 'realizado').length / semanas);

    return { realizadas, faltas, totalMes, presenca, absenteismo, pacientesAtivos, mediaSemanais };
  }, [data, currentMonth]);

  // ── Volume por mês ─────────────────────────────────────
  const sessionsByMonth = useMemo(() => months6.map((m) => {
    const ms = data.sessions.filter((s) => s.data?.startsWith(m));
    return {
      label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3),
      total: ms.length,
      realizadas: ms.filter((s) => s.status === 'realizado').length,
      faltas: ms.filter((s) => s.status === 'falta' || s.status === 'cancelado').length,
    };
  }), [months6, data.sessions]);
  const maxSess = Math.max(...sessionsByMonth.map((m) => m.total), 1);

  // ── Por profissional ───────────────────────────────────
  const byProfissional = useMemo(() => {
    const map: Record<string, { nome: string; realizadas: number; total: number }> = {};
    data.sessions.forEach((s) => {
      const fId = s.funcionario_id;
      const key = fId ? String(fId) : '__sem__';
      const nome = fId ? (data.team.find((t) => t.id === fId)?.nome ?? `Prof. ${fId}`) : 'Sem profissional';
      if (!map[key]) map[key] = { nome, realizadas: 0, total: 0 };
      map[key].total++;
      if (s.status === 'realizado') map[key].realizadas++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [data.sessions, data.team]);
  const maxProf = Math.max(...byProfissional.map((p) => p.total), 1);

  // ── Por tipo de sessão ─────────────────────────────────
  const byTipo = useMemo(() => {
    const map: Record<string, number> = {};
    data.sessions.filter((s) => s.status === 'realizado').forEach((s) => {
      const t = s.tipo?.split(' - ')[0] || 'Outro';
      map[t] = (map[t] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [data.sessions]);
  const maxTipo = Math.max(...byTipo.map((t) => t[1]), 1);

  // ── Perfil etário ──────────────────────────────────────
  const faixasEtarias = useMemo(() => {
    const ranges = [
      { label: '0–3', min: 0, max: 3 },
      { label: '4–6', min: 4, max: 6 },
      { label: '7–10', min: 7, max: 10 },
      { label: '11–14', min: 11, max: 14 },
      { label: '15+', min: 15, max: 99 },
      { label: 'N/D', min: -1, max: -1 },
    ];
    const now = new Date();
    return ranges.map((r) => {
      const count = data.children.filter((c) => {
        if (!c.dob) return r.label === 'N/D';
        if (r.label === 'N/D') return false;
        const age = now.getFullYear() - new Date(c.dob).getFullYear();
        return age >= r.min && age <= r.max;
      }).length;
      return { label: r.label, count };
    }).filter((f) => f.count > 0);
  }, [data.children]);
  const maxFaixa = Math.max(...faixasEtarias.map((f) => f.count), 1);

  // ── Por diagnóstico ────────────────────────────────────
  const byDiag = useMemo(() => {
    const map: Record<string, number> = {};
    data.children.forEach((c) => {
      const raw = (c.diagnosis?.trim() ?? '').toUpperCase();
      let key: string;
      if (!raw) {
        key = 'Não informado';
      } else if (raw.includes('TEA') || raw.includes('AUTIS') || raw.includes('ESPECTRO') || raw.includes('TRANSTORNO GLOBAL')) {
        key = 'TEA';
      } else if (raw.includes('TDAH') || raw === 'TDA' || raw.includes('DEFICIT DE ATEN') || raw.includes('DÉFICIT DE ATEN')) {
        key = 'TDAH';
      } else {
        key = (c.diagnosis?.trim() ?? 'Outro').slice(0, 20);
      }
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data.children]);

  // ── Absenteísmo por mês ────────────────────────────────
  const absenteismoMensal = useMemo(() => months6.map((m) => {
    const ms = data.sessions.filter((s) => s.data?.startsWith(m));
    const total = ms.length;
    const faltas = ms.filter((s) => s.status === 'falta' || s.status === 'cancelado').length;
    return {
      label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3),
      pct: total > 0 ? Math.round((faltas / total) * 100) : 0,
      faltas,
      total,
    };
  }), [months6, data.sessions]);

  // ── Receita por status ─────────────────────────────────
  const receitaByStatus = useMemo(() => {
    const labels: Record<string, string> = { recebido: 'Recebido', pendente: 'Pendente', inadimplente: 'Inadimplente', parcial: 'Parcial' };
    const colors: Record<string, string> = { recebido: '#10b981', pendente: '#f59e0b', inadimplente: '#ef4444', parcial: '#06b6d4' };
    const map: Record<string, { count: number; previsto: number; recebido: number }> = {};
    ['recebido', 'pendente', 'inadimplente', 'parcial'].forEach((s) => { map[s] = { count: 0, previsto: 0, recebido: 0 }; });
    data.payments.forEach((p) => {
      if (map[p.status]) {
        map[p.status].count++;
        map[p.status].previsto += p.valor_previsto ?? 0;
        map[p.status].recebido += p.valor_recebido ?? 0;
      }
    });
    const total = Object.values(map).reduce((s, v) => s + v.previsto, 0);
    const items = Object.entries(map).map(([s, v]) => ({ status: s, label: labels[s], color: colors[s], ...v }));
    return { items, total };
  }, [data.payments]);

  // ── Avaliações por instrumento ─────────────────────────
  const avaliacoesByTipo = useMemo(() => {
    const map: Record<string, number> = {};
    data.evaluations.forEach((e) => {
      const tipo = e.tipo?.trim() || 'Outro';
      map[tipo] = (map[tipo] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.evaluations]);

  // ── Pacientes por status clínico ───────────────────────
  const pacientesByStatus = useMemo(() => ({
    ativo:  data.children.filter((c) => c.status === 'ativo').length,
    inativo: data.children.filter((c) => c.status === 'inativo').length,
    alta:   data.children.filter((c) => c.status === 'alta').length,
  }), [data.children]);

  // ── Tendência de novos pacientes ───────────────────────
  const tendenciaPacientes = useMemo(() => months6.map((m) => ({
    label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3),
    count: data.children.filter((c) => c.created_at?.startsWith(m)).length,
  })), [months6, data.children]);
  const hasCreatedAt = data.children.some((c) => !!c.created_at);
  const maxTend = Math.max(...tendenciaPacientes.map((t) => t.count), 1);

  // ── Totais importados ──────────────────────────────────
  const temDadosImportados = data.children.length + data.payments.length + data.evaluations.length + data.expenses.length > 0;

  const DIAG_COLORS = ['var(--p)', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
  const inp: React.CSSProperties = { background: 'var(--sf2)', border: '1.5px solid var(--bdr)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--t1)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  void inp;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Dados importados ── */}
      {temDadosImportados && (
        <Card title="Dados importados" badge="visão geral">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            <Kpi value={data.children.length} label="Pacientes" color="#3b82f6" accent="#3b82f6" />
            <Kpi value={data.payments.length} label="Pagamentos" color="#10b981" accent="#10b981" />
            <Kpi value={data.evaluations.length} label="Avaliações" color="#8b5cf6" accent="#8b5cf6" />
            <Kpi value={data.expenses.length} label="Despesas" color="#f59e0b" accent="#f59e0b" />
          </div>
        </Card>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        <Kpi value={kpis.realizadas} label="Sessões realizadas este mês" color="#10b981" accent="#10b981" />
        <Kpi value={kpis.pacientesAtivos} label="Pacientes ativos" color="var(--p)" accent="var(--p)" />
        <Kpi value={`${kpis.presenca}%`} label="Taxa de presença" color={pctColor(kpis.presenca)} sub={`${kpis.totalMes} sessões agendadas`} accent={pctColor(kpis.presenca)} />
        <Kpi value={kpis.faltas} label="Faltas / Cancelamentos" color={kpis.faltas > 0 ? '#ef4444' : 'var(--t3)'} accent={kpis.faltas > 0 ? '#ef4444' : 'var(--bdr)'} />
        <Kpi value={`${kpis.absenteismo}%`} label="Taxa absenteísmo" color={pctColor(100 - kpis.absenteismo)} sub="Faltas + cancelamentos" accent={kpis.absenteismo > 20 ? '#ef4444' : '#10b981'} />
        <Kpi value={kpis.mediaSemanais} label="Sessões/semana (média 3m)" color="var(--v)" accent="var(--v)" />
      </div>

      {/* ── Pacientes por status ── */}
      {data.children.length > 0 && (
        <Card title="Pacientes por status" badge={data.children.length}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
            {([
              { label: 'Ativos', count: pacientesByStatus.ativo, color: '#10b981' },
              { label: 'Inativos', count: pacientesByStatus.inativo, color: '#f59e0b' },
              { label: 'Alta', count: pacientesByStatus.alta, color: '#8b5cf6' },
            ] as const).map(({ label, count, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 12px', background: 'var(--sf2)', borderRadius: 10, border: `1px solid ${color}30` }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Volume mensal ── */}
      <Card title="Volume de sessões — 6 meses" badge={`${data.sessions.length} total`}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130, marginBottom: 12 }}>
          {sessionsByMonth.map((m) => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              {m.total > 0 && <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700 }}>{m.total}</div>}
              <div style={{ width: '100%', height: `${Math.max((m.total / maxSess) * 100, m.total > 0 ? 5 : 0)}%`, position: 'relative', borderRadius: '4px 4px 0 0', minHeight: 4 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'var(--sf2)', borderRadius: '4px 4px 0 0' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${m.faltas > 0 && m.total > 0 ? (m.faltas / m.total) * 100 : 0}%`, background: '#ef444430', borderRadius: '4px 4px 0 0' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${m.total > 0 ? (m.realizadas / m.total) * 100 : 0}%`, background: '#10b981', borderRadius: '4px 4px 0 0', transition: 'height .4s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--bdr)', paddingTop: 10 }}>
          {[['#10b981', 'Realizadas'], ['var(--sf2)', 'Agendadas'], ['#ef444430', 'Faltas']].map(([c, l]) => (
            <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c as string }} />{l}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Por profissional + Absenteísmo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>

        {/* Sessões por profissional */}
        <Card title="Sessões por profissional">
          {byProfissional.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'center', padding: '20px 0' }}>
              Nenhum profissional vinculado às sessões ainda
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byProfissional.map((p, i) => {
                const presencaPct = p.total > 0 ? Math.round((p.realizadas / p.total) * 100) : 0;
                return (
                  <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: DIAG_COLORS[i % DIAG_COLORS.length] + '20', border: `1px solid ${DIAG_COLORS[i % DIAG_COLORS.length]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: DIAG_COLORS[i % DIAG_COLORS.length], flexShrink: 0 }}>
                      {p.nome.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{p.nome}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', flexShrink: 0 }}>{p.total} sess.</div>
                      </div>
                      <div style={{ height: 7, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${(p.total / maxProf) * 100}%`, background: DIAG_COLORS[i % DIAG_COLORS.length] + '30', borderRadius: 4 }} />
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(p.realizadas / maxProf) * 100}%`, background: DIAG_COLORS[i % DIAG_COLORS.length], borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: pctColor(presencaPct), flexShrink: 0, width: 32, textAlign: 'right' }}>{presencaPct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Absenteísmo por mês */}
        <Card title="Absenteísmo mensal" badge={`${kpis.absenteismo}% este mês`}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 10 }}>
            {absenteismoMensal.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                {m.pct > 0 && <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 700 }}>{m.pct}%</div>}
                <div style={{ width: '100%', height: `${Math.max(m.pct, m.pct > 0 ? 4 : 0)}%`, background: m.pct > 30 ? '#ef4444' : m.pct > 15 ? '#f59e0b' : '#10b98166', borderRadius: '4px 4px 0 0', transition: 'height .4s ease', minHeight: m.pct > 0 ? 4 : 0 }} />
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--bdr)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--t3)' }}>Absenteísmo alvo: &lt;15%</span>
              <span style={{ fontWeight: 700, color: kpis.absenteismo <= 15 ? '#10b981' : kpis.absenteismo <= 25 ? '#f59e0b' : '#ef4444' }}>
                {kpis.absenteismo <= 15 ? 'Excelente' : kpis.absenteismo <= 25 ? 'Atenção' : 'Crítico'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Perfil pacientes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>

        {/* Faixa etária */}
        <Card title="Perfil etário dos pacientes" badge={`${data.children.length} pacientes`}>
          {faixasEtarias.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>Nenhum paciente cadastrado</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {faixasEtarias.map((f, i) => {
                const pct = Math.round((f.count / data.children.length) * 100);
                return (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, fontSize: 12, fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>{f.label}</div>
                    <div style={{ flex: 1, height: 10, background: 'var(--sf2)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: DIAG_COLORS[i % DIAG_COLORS.length], borderRadius: 5, transition: 'width .4s ease' }} />
                    </div>
                    <div style={{ width: 54, fontSize: 12, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{f.count} ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Por diagnóstico */}
        <Card title="Diagnósticos" badge={data.children.length}>
          {byDiag.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>Nenhum diagnóstico registrado</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {byDiag.map(([diag, count], i) => {
                const pct = Math.round((count / data.children.length) * 100);
                return (
                  <div key={diag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: DIAG_COLORS[i % DIAG_COLORS.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{diag}</div>
                    <div style={{ flex: 2, height: 8, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: DIAG_COLORS[i % DIAG_COLORS.length], borderRadius: 4, transition: 'width .4s ease' }} />
                    </div>
                    <div style={{ width: 48, fontSize: 12, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{count} ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Por tipo de sessão ── */}
      {byTipo.length > 0 && (
        <Card title="Sessões por tipo / modalidade" badge="realizadas">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {byTipo.map(([tipo, count], i) => (
              <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--t1)', flexShrink: 0 }}>{count}</div>
                  </div>
                  <div style={{ height: 7, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxTipo) * 100}%`, background: DIAG_COLORS[i % DIAG_COLORS.length], borderRadius: 4, transition: 'width .4s ease' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Receita por status ── */}
      {data.payments.length > 0 && (
        <Card title="Receita por status" badge={`${data.payments.length} pagamentos`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {receitaByStatus.items.filter((s) => s.count > 0).map((s) => {
              const pct = receitaByStatus.total > 0 ? Math.round((s.previsto / receitaByStatus.total) * 100) : 0;
              return (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <div style={{ width: 90, fontSize: 12, fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>{s.label}</div>
                  <div style={{ flex: 1, height: 9, background: 'var(--sf2)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 5, transition: 'width .4s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', flexShrink: 0, width: 22, textAlign: 'right' }}>{s.count}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: s.color, flexShrink: 0, textAlign: 'right', minWidth: 95 }}>
                    {s.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              );
            })}
            {receitaByStatus.total > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--bdr)', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--t2)' }}>Total previsto</span>
                <span style={{ fontWeight: 900, color: 'var(--t1)' }}>
                  {receitaByStatus.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Avaliações por instrumento ── */}
      {data.evaluations.length > 0 && (
        <Card title="Avaliações por instrumento" badge={data.evaluations.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {avaliacoesByTipo.map(([tipo, count], i) => {
              const pct = Math.round((count / data.evaluations.length) * 100);
              return (
                <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: DIAG_COLORS[i % DIAG_COLORS.length] + '20', border: `1px solid ${DIAG_COLORS[i % DIAG_COLORS.length]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: DIAG_COLORS[i % DIAG_COLORS.length], flexShrink: 0 }}>
                    {tipo.slice(0, 4).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--t1)', flexShrink: 0, marginLeft: 8 }}>{count}</div>
                    </div>
                    <div style={{ height: 7, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: DIAG_COLORS[i % DIAG_COLORS.length], borderRadius: 4, transition: 'width .4s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Tendência de novos pacientes ── */}
      {hasCreatedAt && (
        <Card title="Novos pacientes — 6 meses">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 10 }}>
            {tendenciaPacientes.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                {m.count > 0 && <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700 }}>{m.count}</div>}
                <div style={{ width: '100%', height: `${Math.max((m.count / maxTend) * 100, m.count > 0 ? 5 : 0)}%`, background: '#3b82f6', borderRadius: '4px 4px 0 0', transition: 'height .4s ease', minHeight: m.count > 0 ? 4 : 0 }} />
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══ BI EVOLUÇÃO (per-patient — unchanged) ══════════════
function BiEvolucao() {
  const { state } = useApp();
  const { data } = state;

  const activeChildren = useMemo(() => {
    const a = data.children.filter((c) => c.status === 'ativo');
    return a.length > 0 ? a : data.children;
  }, [data.children]);

  const [selectedChildId, setSelectedChildId] = useState<number | null>(
    activeChildren[0]?.id ?? null
  );
  const [search, setSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); return toLocalISODate(d);
  });
  const [dateTo, setDateTo] = useState<string>(() => todayLocalISO());

  const months = useMemo(() => getLastNMonths(6), []);
  const child = useMemo(() => data.children.find((c) => c.id === selectedChildId), [data.children, selectedChildId]);

  const childGoals = useMemo(() => selectedChildId ? data.goals.filter((g) => g.child_id === selectedChildId) : [], [data.goals, selectedChildId]);
  const childSessions = useMemo(() => selectedChildId ? data.sessions.filter((s) => s.child_id === selectedChildId) : [], [data.sessions, selectedChildId]);
  const filteredSessions = useMemo(() => childSessions.filter((s) => s.data >= dateFrom && s.data <= dateTo), [childSessions, dateFrom, dateTo]);

  const goalStats = useMemo(() => {
    const total = childGoals.length;
    const atingido = childGoals.filter((g) => g.status === 'atingido').length;
    const ativo = childGoals.filter((g) => g.status === 'ativo').length;
    const pausado = childGoals.filter((g) => g.status === 'pausado').length;
    return { total, atingido, ativo, pausado, pct: total > 0 ? Math.round((atingido / total) * 100) : 0 };
  }, [childGoals]);

  const sessionStats = useMemo(() => {
    const total = filteredSessions.length;
    const realizadas = filteredSessions.filter((s) => s.status === 'realizado').length;
    const faltas = filteredSessions.filter((s) => s.status === 'falta' || s.status === 'cancelado').length;
    return { total, realizadas, faltas, presenca: total > 0 ? Math.round((realizadas / total) * 100) : 0 };
  }, [filteredSessions]);

  const sessionsByMonth = useMemo(() => months.map((m) => {
    const ms = childSessions.filter((s) => s.data?.startsWith(m));
    return {
      label: MONTH_NAMES[parseInt(m.slice(5, 7)) - 1].slice(0, 3),
      total: ms.length,
      realizadas: ms.filter((s) => s.status === 'realizado').length,
    };
  }), [months, childSessions]);

  const maxSess = Math.max(...sessionsByMonth.map((m) => m.total), 1);

  const goalsByArea = useMemo(() => {
    const map: Record<string, { total: number; atingido: number }> = {};
    childGoals.forEach((g) => {
      const area = g.area || 'Geral';
      if (!map[area]) map[area] = { total: 0, atingido: 0 };
      map[area].total++;
      if (g.status === 'atingido') map[area].atingido++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [childGoals]);

  const dttByActivity = useMemo(() => {
    const dttSessions = filteredSessions
      .filter((s) => s.tipo?.startsWith('DTT - '))
      .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
    const map: Record<string, { nome: string; categoria: string; execs: Array<{ data: string; acertos: number; parciais: number; erros: number; total: number; pct: number; obs?: string }> }> = {};
    dttSessions.forEach((s) => {
      const nome = s.tipo.slice(5);
      if (!map[nome]) {
        let cat = '';
        try { cat = (JSON.parse(s.notas || '{}')).categoria || ''; } catch { /* noop */ }
        map[nome] = { nome, categoria: cat, execs: [] };
      }
      try {
        const n = JSON.parse(s.notas || '{}');
        map[nome].execs.push({ data: s.data, acertos: n.acertos ?? 0, parciais: n.parciais ?? 0, erros: n.erros ?? 0, total: n.total ?? 0, pct: n.pct ?? 0, obs: n.obs });
      } catch { /* noop */ }
    });
    return Object.values(map).sort((a, b) => b.execs.length - a.execs.length);
  }, [filteredSessions]);

  const childEvals = useMemo(() => data.evaluations.filter((e) => e.child_id === selectedChildId).sort((a, b) => b.data.localeCompare(a.data)), [data.evaluations, selectedChildId]);

  const AREA_COLORS = ['var(--p)', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
  const inp: React.CSSProperties = { background: 'var(--sf2)', border: '1.5px solid var(--bdr)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--t1)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? activeChildren.filter((c) => c.name.toLowerCase().includes(q)) : activeChildren;
  }, [activeChildren, search]);

  const setPreset = (months: number) => {
    const d = new Date(); d.setMonth(d.getMonth() - months);
    setDateFrom(toLocalISODate(d));
    setDateTo(todayLocalISO());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Seletor */}
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '16px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Paciente selecionado</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 400 }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: .4 }} width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input type="text" placeholder="Digite o nome do paciente..." value={search} onChange={(e) => { setSearch(e.target.value); setDropOpen(true); }} onFocus={() => setDropOpen(true)} onBlur={() => setTimeout(() => setDropOpen(false), 150)} style={{ ...inp, width: '100%', paddingLeft: 38, fontSize: 14 }} />
            </div>
            {dropOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--sf)', border: '1.5px solid var(--p)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.3)', marginTop: 4, maxHeight: 260, overflowY: 'auto' }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--t3)' }}>Nenhum paciente encontrado</div>
                ) : searchResults.map((c) => {
                  const sel = selectedChildId === c.id;
                  return (
                    <div key={c.id} onMouseDown={() => { setSelectedChildId(c.id); setSearch(''); setDropOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', background: sel ? 'var(--ps)' : 'transparent', borderBottom: '1px solid var(--bdr)', transition: 'background .1s' }}
                      onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--sf2)'; }}
                      onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: sel ? 'var(--p)' : 'var(--sf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: sel ? '#fff' : 'var(--t2)', flexShrink: 0 }}>{c.name.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: sel ? 'var(--p)' : 'var(--t1)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{c.status === 'ativo' ? 'Em terapia' : c.status}</div>
                      </div>
                      {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--p)', flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {child ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--ps)', border: '2px solid var(--p)', borderRadius: 12, flex: '0 0 auto' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--p)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>{child.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--p)' }}>{child.name.split(' ').slice(0, 2).join(' ')}</div>
                <div style={{ fontSize: 11, color: 'var(--p)', opacity: .7, marginTop: 1 }}>Em terapia · {activeChildren.length} ativo{activeChildren.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--t3)', padding: '12px 0' }}>Nenhum paciente selecionado</div>
          )}
        </div>
      </div>

      {!child ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)', fontSize: 14 }}>Selecione um paciente acima</div>
      ) : (
        <>
          {/* Filtro período */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', background: 'var(--sf2)', borderRadius: 10, border: '1px solid var(--bdr)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', flexShrink: 0 }}>Período:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inp, width: 145 }} />
              <span style={{ color: 'var(--t3)', fontSize: 12, fontWeight: 600 }}>até</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inp, width: 145 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {[['1m', 1], ['3m', 3], ['6m', 6], ['1 ano', 12]].map(([label, n]) => (
                <button key={label as string} onClick={() => setPreset(Number(n))} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--bdr)', background: 'var(--sf)', color: 'var(--t2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
              ))}
            </div>
          </div>

          {/* KPIs paciente */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <Kpi value={`${sessionStats.presenca}%`} label="Taxa de presença" color={pctColor(sessionStats.presenca)} sub={`${sessionStats.realizadas} de ${sessionStats.total} sessões`} accent={pctColor(sessionStats.presenca)} />
            <Kpi value={sessionStats.realizadas} label="Sessões realizadas" color="#10b981" accent="#10b981" />
            <Kpi value={sessionStats.faltas} label="Faltas / Canceladas" color={sessionStats.faltas > 0 ? '#ef4444' : 'var(--t3)'} accent={sessionStats.faltas > 0 ? '#ef4444' : 'var(--bdr)'} />
            <Kpi value={`${goalStats.pct}%`} label="Metas atingidas" color={pctColor(goalStats.pct)} sub={`${goalStats.atingido} de ${goalStats.total} metas`} accent={pctColor(goalStats.pct)} />
            <Kpi value={goalStats.ativo} label="Metas em andamento" color="var(--p)" accent="var(--p)" />
            <Kpi value={childEvals.length} label="Avaliações" color="var(--v)" accent="var(--v)" />
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
            <Card title="Frequência de sessões" badge="6 meses">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, marginBottom: 10 }}>
                {sessionsByMonth.map((m) => (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    {m.total > 0 && <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 700 }}>{m.total}</div>}
                    <div style={{ width: '100%', height: `${Math.max((m.total / maxSess) * 100, m.total > 0 ? 5 : 0)}%`, position: 'relative', borderRadius: '4px 4px 0 0' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'var(--sf2)', borderRadius: '4px 4px 0 0' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${m.total > 0 ? (m.realizadas / m.total) * 100 : 0}%`, background: '#10b981', borderRadius: '4px 4px 0 0', transition: 'height .4s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, borderTop: '1px solid var(--bdr)', paddingTop: 12 }}>
                {[['var(--sf2)', 'Agendadas'], ['#10b981', 'Realizadas']].map(([c, l]) => (
                  <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t3)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c as string }} />{l}
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 900, color: pctColor(sessionStats.presenca) }}>{sessionStats.presenca}% presença</div>
              </div>
            </Card>

            <Card title="Progresso de metas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--sf2)" strokeWidth="9" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={pctColor(goalStats.pct)} strokeWidth="9" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - goalStats.pct / 100)}`}
                      transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--t1)', lineHeight: 1 }}>{goalStats.pct}%</div>
                    <div style={{ fontSize: 8, color: 'var(--t3)', fontWeight: 600 }}>atingido</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[{ label: 'Atingidas', count: goalStats.atingido, color: '#10b981' }, { label: 'Em andamento', count: goalStats.ativo, color: 'var(--p)' }, { label: 'Pausadas', count: goalStats.pausado, color: 'var(--t3)' }].map(({ label, count, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        <span style={{ fontSize: 12, color: 'var(--t2)' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              {goalsByArea.length > 0 ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Por área</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {goalsByArea.slice(0, 4).map(([area, { total, atingido }], i) => {
                      const pct = total > 0 ? Math.round((atingido / total) * 100) : 0;
                      return (
                        <div key={area} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 100, fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{area}</div>
                          <div style={{ flex: 1, height: 8, background: 'var(--sf2)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: AREA_COLORS[i % AREA_COLORS.length], borderRadius: 4, transition: 'width .4s ease' }} />
                          </div>
                          <div style={{ width: 36, fontSize: 11, fontWeight: 700, color: 'var(--t1)', textAlign: 'right', flexShrink: 0 }}>{atingido}/{total}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--t3)', fontSize: 12 }}>
                  Crie metas em <strong style={{ color: 'var(--p)' }}>Atividades (PEI)</strong> para ver o progresso
                </div>
              )}
            </Card>
          </div>

          {/* DTT */}
          {dttByActivity.length > 0 && (
            <Card title="Atividades DTT — execuções no período" badge={`${dttByActivity.reduce((s, a) => s + a.execs.length, 0)} execuções`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {dttByActivity.map((act) => {
                  const last = act.execs[0]?.pct ?? 0;
                  const first = act.execs[act.execs.length - 1]?.pct ?? 0;
                  const trend = last - first;
                  const avgPct = act.execs.length > 0 ? Math.round(act.execs.reduce((s, e) => s + e.pct, 0) / act.execs.length) : 0;
                  return (
                    <div key={act.nome} style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden', background: 'var(--sf2)' }}>
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--sf)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.nome}</div>
                          {act.categoria && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{act.categoria}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: pctColor(last), lineHeight: 1 }}>{last}%</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {act.execs.length > 1 && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : 'var(--t3)', background: trend > 0 ? '#10b98120' : trend < 0 ? '#ef444420' : 'var(--sf2)', border: `1px solid ${trend > 0 ? '#10b98140' : trend < 0 ? '#ef444440' : 'var(--bdr)'}`, borderRadius: 6, padding: '2px 7px' }}>
                                {trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : `0%`}
                              </span>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '2px 7px' }}>{act.execs.length}x</span>
                          </div>
                        </div>
                      </div>
                      {act.execs.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, padding: '6px 14px 0' }}>
                          {[...act.execs].reverse().map((ex, i) => <SparkBar key={i} pct={ex.pct} color={pctColor(ex.pct)} />)}
                        </div>
                      )}
                      <div>
                        {act.execs.slice(0, 4).map((ex, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--bdr)', fontSize: 12 }}>
                            <div style={{ color: 'var(--t3)', flexShrink: 0, width: 78, fontSize: 11 }}>{new Date(ex.data + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                            <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>{ex.acertos} acertos</span>
                              {ex.parciais > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}>{ex.parciais} parciais</span>}
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>{ex.erros} erros</span>
                              <span style={{ color: 'var(--t3)' }}>/{ex.total}</span>
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 13, color: pctColor(ex.pct), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{ex.pct}%</div>
                          </div>
                        ))}
                        {act.execs.length > 4 && (
                          <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--t3)', borderTop: '1px solid var(--bdr)', textAlign: 'center' }}>
                            + {act.execs.length - 4} execuções · Média: {avgPct}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {dttByActivity.length === 0 && (
            <div style={{ background: 'var(--sf)', border: '1px dashed var(--bdr)', borderRadius: 'var(--r)', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>Nenhuma atividade DTT registrada no período</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Execute atividades em <strong style={{ color: 'var(--p)' }}>Atividades (PEI)</strong> para ver a evolução aqui</div>
            </div>
          )}

          {childEvals.length > 0 && (
            <Card title="Avaliações realizadas" badge={childEvals.length}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {childEvals.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--ps)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--p)' }}>{e.tipo.slice(0, 4)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{e.tipo}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                      {e.notas && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notas}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ═══ MAIN BI SCREEN ════════════════════════════════════
export default function BiScreen() {
  const [activeTab, setActiveTab] = useState<BiTab>('evolucao');

  const tabs: { key: BiTab; label: string; icon: string }[] = [
    { key: 'evolucao', label: 'Evolução do Paciente', icon: '📈' },
    { key: 'clinica', label: 'Painel Clínico', icon: '🏥' },
  ];

  return (
    <div className="view show" id="v-bi">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Analytics</div>
          <h1 className="ph-title">BI — Inteligência Clínica</h1>
          <div className="ph-sub">Evolução de pacientes · Volume de atendimentos · Perfil clínico · Absenteísmo</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--bdr)', overflowX: 'auto' }}>
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 20px', border: 'none',
                borderBottom: `2px solid ${activeTab === key ? 'var(--p)' : 'transparent'}`,
                background: 'none', color: activeTab === key ? 'var(--p)' : 'var(--t2)',
                fontWeight: activeTab === key ? 700 : 500, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'evolucao' && <BiEvolucao />}
        {activeTab === 'clinica' && <BiClinica />}
      </div>
    </div>
  );
}
