'use client';

import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Screen } from '@/lib/types';

interface Props {
  onNav?: (s: Screen) => void;
}

export default function PortalScreen(_props: Props) {
  const { state } = useApp();
  const { data, user } = state;

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

  const progressPct = useMemo(() => {
    const done = childGoals.filter((g) => g.status === 'atingido').length;
    return childGoals.length > 0 ? Math.round((done / childGoals.length) * 100) : 0;
  }, [childGoals]);

  const marcosCount = useMemo(() =>
    childGoals.filter((g) => g.status === 'atingido').length,
  [childGoals]);

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
      key: 'bi' as Screen,
      label: 'Evolução',
      sub: 'BI e gráficos de progresso',
      color: 'dt-blue',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      key: 'agenda' as Screen,
      label: 'Atividades',
      sub: 'Tarefas e exercícios diários',
      color: 'dt-orange',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      key: 'pei' as Screen,
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
      key: 'reavix' as Screen,
      label: 'Mensagens',
      sub: 'Chat com a equipe clínica',
      color: 'dt-teal',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      key: 'agenda' as Screen,
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
            style={{ cursor: 'default', opacity: 0.85 }}
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
