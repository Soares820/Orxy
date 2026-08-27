'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Screen, Sessao, Meta, Avaliacao } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { SCORE_DEFS, TIPO_DESC } from './AvaliacoesScreen';

interface Props {
  onNav?: (s: Screen) => void;
}

type PortalView = 'home' | 'evolucao' | 'atividades' | 'marcos' | 'sessoes';

const SESSAO_STATUS_LABEL: Record<Sessao['status'], string> = {
  agendado: 'Agendada',
  realizado: 'Realizada',
  cancelado: 'Cancelada',
  falta: 'Falta',
};

const SESSAO_STATUS_COLOR: Record<Sessao['status'], string> = {
  agendado: '#60A5FA',
  realizado: '#34D399',
  cancelado: '#94A3B8',
  falta: '#F87171',
};

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 10, border: '1px solid var(--bdr)',
          background: 'var(--sf)', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0,
        }}
        title="Voltar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>{title}</h1>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--t3)', fontSize: 14 }}>
      {text}
    </div>
  );
}

function ScoreBar({ label, value, min, max, unit }: { label: string; value: number; min: number; max: number; unit?: string }) {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{value}{unit ? ` ${unit}` : ''}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--sf2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: 'linear-gradient(90deg,#2563EB,#7C3AED)' }} />
      </div>
    </div>
  );
}

function EvolucaoView({ evaluations }: { evaluations: Avaliacao[] }) {
  const byTipo = useMemo(() => {
    const groups = new Map<Avaliacao['tipo'], Avaliacao[]>();
    for (const ev of evaluations) {
      const list = groups.get(ev.tipo) ?? [];
      list.push(ev);
      groups.set(ev.tipo, list);
    }
    Array.from(groups.values()).forEach((list) => list.sort((a, b) => a.data.localeCompare(b.data)));
    return Array.from(groups.entries()).sort((a, b) => {
      const lastA = a[1][a[1].length - 1]?.data ?? '';
      const lastB = b[1][b[1].length - 1]?.data ?? '';
      return lastB.localeCompare(lastA);
    });
  }, [evaluations]);

  if (byTipo.length === 0) {
    return <EmptyState text="Ainda não há avaliações registradas para acompanhar a evolução." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {byTipo.map(([tipo, list]) => {
        const first = list[0];
        const last = list[list.length - 1];
        const defs = SCORE_DEFS[tipo];
        return (
          <div key={tipo} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{tipo}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                {list.length > 1 ? `${formatDate(first.data)} → ${formatDate(last.data)}` : formatDate(last.data)}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>{TIPO_DESC[tipo]}</div>

            {defs ? (
              defs.map((def) => {
                const lastVal = Number(last.scores?.[def.key]);
                if (Number.isNaN(lastVal)) return null;
                const firstVal = list.length > 1 ? Number(first.scores?.[def.key]) : null;
                const delta = firstVal !== null && !Number.isNaN(firstVal) ? lastVal - firstVal : null;
                return (
                  <div key={def.key}>
                    <ScoreBar label={def.label} value={lastVal} min={def.min} max={def.max} unit={def.unit} />
                    {delta !== null && delta !== 0 && (
                      <div style={{ fontSize: 11, color: delta > 0 ? '#34D399' : '#F87171', marginTop: -6, marginBottom: 8 }}>
                        {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} desde a primeira avaliação
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              Object.entries(last.scores ?? {}).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: 'var(--t2)' }}>
                  <span>{key}</span><span style={{ fontWeight: 700, color: 'var(--t1)' }}>{String(val)}</span>
                </div>
              ))
            )}
            {list.length > 1 && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{list.length} avaliações registradas</div>}
          </div>
        );
      })}
    </div>
  );
}

function GoalListView({ goals, emptyText }: { goals: Meta[]; emptyText: string }) {
  if (goals.length === 0) return <EmptyState text={emptyText} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {goals.map((g) => (
        <div key={g.id} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{g.nome ?? g.descricao}</div>
            {g.area && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', background: 'rgba(124,58,237,.14)', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                {g.area}
              </span>
            )}
          </div>
          {g.nome && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>{g.descricao}</div>}
        </div>
      ))}
    </div>
  );
}

function SessoesView({ sessions }: { sessions: Sessao[] }) {
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)),
    [sessions],
  );
  if (sorted.length === 0) return <EmptyState text="Ainda não há sessões registradas." />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((s) => (
        <div key={s.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '12px 18px',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{s.tipo}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>
              {formatDate(s.data)} às {s.hora}{s.duracao_min ? ` · ${s.duracao_min} min` : ''}
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: SESSAO_STATUS_COLOR[s.status],
            background: `${SESSAO_STATUS_COLOR[s.status]}26`, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap',
          }}>
            {SESSAO_STATUS_LABEL[s.status]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PortalScreen(_props: Props) {
  const { state } = useApp();
  const { data, user } = state;
  const [view, setView] = useState<PortalView>('home');

  const isClinicView = user?.role !== 'familia';

  // AppContext.loadUserData scopes pacientes/sessoes/metas/avaliacoes to
  // users.paciente_id for role='familia', so data.children is already just
  // this family's child (empty if not yet linked by the clinic — see below).
  const myChild = data.children[0] ?? null;

  const childSessions = useMemo(() => {
    if (!myChild) return [];
    return data.sessions.filter((s) => s.child_id === myChild.id);
  }, [data.sessions, myChild]);

  const childGoals = useMemo(() => {
    if (!myChild) return [];
    return data.goals.filter((g) => g.child_id === myChild.id);
  }, [data.goals, myChild]);

  const childEvaluations = useMemo(() => {
    if (!myChild) return [];
    return data.evaluations.filter((e) => e.child_id === myChild.id);
  }, [data.evaluations, myChild]);

  const atividades = useMemo(() => childGoals.filter((g) => g.tipo_registro === 'atividade'), [childGoals]);
  const marcos = useMemo(() => childGoals.filter((g) => g.status === 'atingido'), [childGoals]);

  const progressPct = useMemo(() => {
    const done = childGoals.filter((g) => g.status === 'atingido').length;
    return childGoals.length > 0 ? Math.round((done / childGoals.length) * 100) : 0;
  }, [childGoals]);

  const marcosCount = marcos.length;

  const nextSession = useMemo(() => {
    const future = childSessions
      .filter((s) => s.status === 'agendado')
      .sort((a, b) => a.data.localeCompare(b.data));
    return future[0] ?? null;
  }, [childSessions]);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const tiles = [
    {
      key: 'evolucao' as PortalView,
      label: 'Evolução',
      sub: 'Avaliações e progresso',
      color: 'dt-blue',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      key: 'atividades' as PortalView,
      label: 'Atividades',
      sub: 'Tarefas e exercícios',
      color: 'dt-orange',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      key: 'marcos' as PortalView,
      label: 'Marcos',
      sub: 'Conquistas e metas atingidas',
      color: 'dt-green',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      key: 'sessoes' as PortalView,
      label: 'Sessões',
      sub: 'Histórico de atendimentos',
      color: 'dt-purple',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ];

  if (!isClinicView && !myChild) {
    return (
      <div className="dash-content">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', gap: 14, padding: '64px 24px', minHeight: 320,
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Portal ainda não disponível</h1>
          <p style={{ fontSize: 14, color: 'var(--t2)', maxWidth: 420, margin: 0 }}>
            Seu acesso ainda não foi vinculado a um paciente. Entre em contato com a clínica para liberar o acompanhamento pelo Portal da Família.
          </p>
        </div>
      </div>
    );
  }

  if (view !== 'home') {
    const titles: Record<PortalView, string> = {
      home: '', evolucao: 'Evolução', atividades: 'Atividades', marcos: 'Marcos', sessoes: 'Sessões',
    };
    return (
      <div className="dash-content">
        {isClinicView && (
          <div style={{ background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 10, padding: '10px 18px', fontSize: 12, color: '#FBBF24', fontWeight: 600, alignSelf: 'flex-start' }}>
            Preview — Assim as famílias verão o Portal
          </div>
        )}
        <BackHeader title={titles[view]} onBack={() => setView('home')} />
        {view === 'evolucao' && <EvolucaoView evaluations={childEvaluations} />}
        {view === 'atividades' && <GoalListView goals={atividades} emptyText="Nenhuma atividade registrada ainda." />}
        {view === 'marcos' && <GoalListView goals={marcos} emptyText="Nenhum marco atingido ainda — continue acompanhando!" />}
        {view === 'sessoes' && <SessoesView sessions={childSessions} />}
      </div>
    );
  }

  return (
    <div className="dash-content">
      {isClinicView && (
        <div style={{ background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 10, padding: '10px 18px', fontSize: 12, color: '#FBBF24', fontWeight: 600, marginTop: -20, marginBottom: -20, alignSelf: 'flex-start' }}>
          Preview — Assim as famílias verão o Portal
        </div>
      )}

      {/* Top greeting area */}
      <div className="dash-top">
        <div>
          {nextSession && (
            <div className="dash-greet-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Sessão hoje às {nextSession.hora}
            </div>
          )}
          <h1 className="dash-greet-h">Olá, Família!</h1>
          <p className="dash-greet-sub">
            Bem-vinda ao ORYX.{' '}
            {myChild ? <><strong>{myChild.name}</strong> tem evoluído muito — acompanhe o progresso {myChild.sex === 'F' ? 'dela' : 'dele'} por aqui.</> : 'Acompanhe o progresso do seu filho por aqui.'}
          </p>
        </div>
        <div className="dash-date-chip">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <span>Hoje</span>
            <strong>{today}</strong>
          </div>
        </div>
      </div>

      {/* Colorful tiles */}
      <div className="dash-tiles">
        {tiles.map((tile) => (
          <button
            key={tile.label}
            className={`dash-tile ${tile.color}`}
            onClick={() => setView(tile.key)}
          >
            <div className="dt-ico">{tile.icon}</div>
            <div className="dt-body">
              <div className="dt-lbl">{tile.label}</div>
              <div className="dt-sub">{tile.sub}</div>
            </div>
            <svg className="dt-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
            </svg>
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-stat-ico" style={{ background: 'rgba(37,99,235,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{progressPct}%</div>
            <div className="dash-stat-lbl">Progresso Geral</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-ico" style={{ background: 'rgba(5,150,105,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{marcosCount}</div>
            <div className="dash-stat-lbl">Marcos Atingidos</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-ico" style={{ background: 'rgba(217,119,6,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{nextSession ? nextSession.hora : '—'}</div>
            <div className="dash-stat-lbl">Próxima Sessão</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-ico" style={{ background: 'rgba(124,58,237,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{childSessions.length}</div>
            <div className="dash-stat-lbl">Total Sessões</div>
          </div>
        </div>
      </div>
    </div>
  );
}
