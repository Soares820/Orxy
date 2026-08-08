'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getLastNMonths, MONTH_NAMES } from '@/lib/utils';

function pctColor(p: number) { return p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'; }

// ─── Mini sparkline bar ───────────────────────────────────
function SparkBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ flex: 1, borderRadius: '3px 3px 0 0', height: `${Math.max(pct, 4)}%`, background: color, transition: 'height .3s ease' }} />
  );
}

// ─── KPI card ────────────────────────────────────────────
function Kpi({ value, label, color, sub, accent }: { value: string | number; label: string; color: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--sf)', border: `1px solid var(--bdr)`, borderRadius: 'var(--r)', padding: '18px 16px', borderTop: `3px solid ${accent || color}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, fontWeight: 700, opacity: .75 }}>{sub}</div>}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────
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

// ═══ BI EVOLUÇÃO ════════════════════════════════════════
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
    const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

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
    const ms = childSessions.filter((s) => s.data.startsWith(m));
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
      .filter((s) => s.tipo.startsWith('DTT - '))
      .sort((a, b) => b.data.localeCompare(a.data));
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
    setDateFrom(d.toISOString().slice(0, 10));
    setDateTo(new Date().toISOString().slice(0, 10));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Seletor de paciente (busca + dropdown) ── */}
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: '16px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Paciente selecionado</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Campo de busca com dropdown */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 400 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: .5, pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="Digite o nome do paciente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)}
                onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                style={{ ...inp, width: '100%', paddingLeft: 38, fontSize: 14 }}
              />
            </div>
            {dropOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--sf)', border: '1.5px solid var(--p)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.3)', marginTop: 4, maxHeight: 260, overflowY: 'auto' }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--t3)' }}>Nenhum paciente encontrado</div>
                ) : searchResults.map((c) => {
                  const sel = selectedChildId === c.id;
                  return (
                    <div
                      key={c.id}
                      onMouseDown={() => { setSelectedChildId(c.id); setSearch(''); setDropOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', background: sel ? 'var(--ps)' : 'transparent', borderBottom: '1px solid var(--bdr)', transition: 'background .1s' }}
                      onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--sf2)'; }}
                      onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: sel ? 'var(--p)' : 'var(--sf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: sel ? '#fff' : 'var(--t2)', flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: sel ? 'var(--p)' : 'var(--t1)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{c.status === 'ativo' ? 'Em terapia' : c.status}</div>
                      </div>
                      {sel && <div style={{ fontSize: 16, color: 'var(--p)' }}>✓</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card do paciente selecionado */}
          {child ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--ps)', border: '2px solid var(--p)', borderRadius: 12, flex: '0 0 auto' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--p)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>
                {child.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--p)' }}>{child.name.split(' ').slice(0, 2).join(' ')}</div>
                <div style={{ fontSize: 11, color: 'var(--p)', opacity: .7, marginTop: 1 }}>Em terapia • {activeChildren.length} paciente{activeChildren.length !== 1 ? 's' : ''} ativo{activeChildren.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--t3)', padding: '12px 0' }}>Nenhum paciente selecionado — use a busca ao lado</div>
          )}
        </div>
      </div>

      {!child ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)', fontSize: 14 }}>
          Selecione um paciente acima para ver a evolução clínica
        </div>
      ) : (
        <>
          {/* ── Filtro de período ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', background: 'var(--sf2)', borderRadius: 10, border: '1px solid var(--bdr)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', flexShrink: 0 }}>Período de análise:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inp, width: 145 }} />
              <span style={{ color: 'var(--t3)', fontSize: 13 }}>→</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inp, width: 145 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {[['1m', 1], ['3m', 3], ['6m', 6], ['1 ano', 12]].map(([label, n]) => (
                <button key={label} onClick={() => setPreset(Number(n))}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--bdr)', background: 'var(--sf)', color: 'var(--t2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── KPIs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <Kpi value={`${sessionStats.presenca}%`} label="Taxa de presença" color={pctColor(sessionStats.presenca)} sub={`${sessionStats.realizadas} de ${sessionStats.total} sessões`} accent={pctColor(sessionStats.presenca)} />
            <Kpi value={sessionStats.realizadas} label="Sessões realizadas" color="#10b981" accent="#10b981" />
            <Kpi value={sessionStats.faltas} label="Faltas / Canceladas" color={sessionStats.faltas > 0 ? '#ef4444' : 'var(--t3)'} accent={sessionStats.faltas > 0 ? '#ef4444' : 'var(--bdr)'} />
            <Kpi value={`${goalStats.pct}%`} label="Metas atingidas" color={pctColor(goalStats.pct)} sub={`${goalStats.atingido} de ${goalStats.total} metas`} accent={pctColor(goalStats.pct)} />
            <Kpi value={goalStats.ativo} label="Metas em andamento" color="var(--p)" accent="var(--p)" />
            <Kpi value={childEvals.length} label="Avaliações" color="var(--v)" accent="var(--v)" />
          </div>

          {/* ── Gráficos principais ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Frequência mensal */}
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
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t3)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 900, color: pctColor(sessionStats.presenca) }}>{sessionStats.presenca}% presença</div>
              </div>
            </Card>

            {/* Progresso de metas */}
            <Card title="Progresso de metas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--sf2)" strokeWidth="9" />
                    <circle cx="40" cy="40" r="32" fill="none"
                      stroke={pctColor(goalStats.pct)} strokeWidth="9" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - goalStats.pct / 100)}`}
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

          {/* ── Atividades DTT ── */}
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
                      {/* Header */}
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
                                {trend > 0 ? `▲ +${trend}%` : trend < 0 ? `▼ ${trend}%` : '→ 0%'}
                              </span>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '2px 7px' }}>{act.execs.length}x</span>
                          </div>
                        </div>
                      </div>
                      {/* Sparkline */}
                      {act.execs.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, padding: '6px 14px 0' }}>
                          {[...act.execs].reverse().map((ex, i) => (
                            <SparkBar key={i} pct={ex.pct} color={pctColor(ex.pct)} />
                          ))}
                        </div>
                      )}
                      {/* Executions */}
                      <div>
                        {act.execs.slice(0, 4).map((ex, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--bdr)', fontSize: 12 }}>
                            <div style={{ color: 'var(--t3)', flexShrink: 0, width: 78, fontSize: 11 }}>
                              {new Date(ex.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                            <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>✓{ex.acertos}</span>
                              {ex.parciais > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}>◑{ex.parciais}</span>}
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>✗{ex.erros}</span>
                              <span style={{ color: 'var(--t3)' }}>/{ex.total}</span>
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 13, color: pctColor(ex.pct), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{ex.pct}%</div>
                          </div>
                        ))}
                        {act.execs.length > 4 && (
                          <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--t3)', borderTop: '1px solid var(--bdr)', textAlign: 'center' }}>
                            + {act.execs.length - 4} execuções • Média: {avgPct}%
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
              <div style={{ fontSize: 28, marginBottom: 10 }}>🎯</div>
              <div style={{ fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>Nenhuma atividade DTT no período</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Execute atividades em <strong style={{ color: 'var(--p)' }}>Atividades (PEI)</strong> para ver a evolução aqui</div>
            </div>
          )}

          {/* ── Avaliações ── */}
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
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                        {new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
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
  return (
    <div className="view show" id="v-bi">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Analytics</div>
          <h1 className="ph-title">Evolução Clínica</h1>
          <div className="ph-sub">Acompanhe o progresso de cada paciente por área e atividade</div>
        </div>
        <BiEvolucao />
      </div>
    </div>
  );
}
