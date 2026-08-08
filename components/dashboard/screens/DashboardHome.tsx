'use client';

import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Screen } from '@/lib/types';

interface Props {
  onNav: (screen: Screen) => void;
}

export default function DashboardHome({ onNav }: Props) {
  const { state } = useApp();
  const { data, user } = state;

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);

    const active = data.children.filter((c) => c.status === 'ativo').length;
    const todaySessions = data.sessions.filter((s) => s.data === today).length;
    const todayDone = data.sessions.filter((s) => s.data === today && s.status === 'realizado').length;

    const monthPayments = data.payments.filter(
      (p) => p.mes === thisMonth && p.status === 'recebido'
    );
    const monthRevenue = monthPayments.reduce((sum, p) => sum + (p.valor_recebido || 0), 0);

    const pending = data.payments.filter((p) => p.status === 'pendente').length;

    const totalSessions = data.sessions.filter(
      (s) => s.status === 'realizado' || s.status === 'cancelado' || s.status === 'falta'
    ).length;
    const realized = data.sessions.filter((s) => s.status === 'realizado').length;
    const presenceRate = totalSessions > 0 ? Math.round((realized / totalSessions) * 100) : 0;

    const teamCount = data.team.length;

    return { active, todaySessions, todayDone, monthRevenue, pending, presenceRate, teamCount };
  }, [data]);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const role = user?.role ?? '';
  const TILE_ROLES: Record<string, string[]> = {
    pacientes:   ['admin', 'terapeuta', 'recepcao'],
    agenda:      ['admin', 'terapeuta', 'recepcao'],
    pei:         ['admin', 'terapeuta'],
    avaliacoes:  ['admin', 'terapeuta'],
    financeiro:  ['admin', 'financeiro'],
    bi:          ['admin', 'financeiro'],
    equipe:      ['admin'],
    reavix:      ['admin', 'terapeuta'],
  };

  const tiles: Array<{ key: Screen; label: string; sub: string; color: string; icon: React.ReactNode }> = [
    {
      key: 'pacientes',
      label: 'Pacientes',
      sub: 'Fichas e histórico clínico',
      color: 'dt-blue',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      key: 'agenda',
      label: 'Agenda',
      sub: 'Calendário e sessões',
      color: 'dt-green',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      key: 'pei',
      label: 'Atividades',
      sub: 'Programas e execução DTT',
      color: 'dt-indigo' as string,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      key: 'avaliacoes',
      label: 'Avaliações',
      sub: 'PEDI, SPM, ABLLS, VBMAPP',
      color: 'dt-cyan' as string,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      key: 'financeiro',
      label: 'Financeiro',
      sub: 'Contratos, pagamentos e receita',
      color: 'dt-green',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      key: 'bi',
      label: 'Evolução Clínica',
      sub: 'Indicadores e progresso',
      color: 'dt-orange',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      key: 'equipe',
      label: 'Equipe',
      sub: 'Profissionais e acessos',
      color: 'dt-dark' as string,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      key: 'reavix',
      label: 'Assistente Clínico',
      sub: 'Suporte especializado ABA/TEA',
      color: 'dt-teal' as string,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <div className="dash-content">
      {/* Top area */}
      <div className="dash-top">
        <div>
          <div className="dash-greet-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
            {stats.todaySessions > 0 ? `${stats.todaySessions} sessões agendadas hoje` : `${stats.teamCount} profissionais online`}
          </div>
          <h1 className="dash-greet-h">
            Bom dia, {user?.name?.split(' ')[0] ?? 'Terapeuta'}.
          </h1>
          <p className="dash-greet-sub">
            {stats.todaySessions > 0
              ? <><strong>{stats.todayDone}/{stats.todaySessions} sessões</strong> concluídas hoje{stats.pending > 0 ? <> · <strong>{stats.pending} cobranças</strong> em aberto</> : null}</>
              : <>Plataforma ativa. Gerencie atendimentos, evolução clínica e financeiro em um só lugar.</>
            }
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

      {/* Colorful tiles grid */}
      <div className="dash-tiles">
        {tiles.filter(t => (TILE_ROLES[t.key] ?? ['admin']).includes(role)).map((tile) => (
          <button
            key={`${tile.key}-${tile.label}`}
            className={`dash-tile ${tile.color}`}
            onClick={() => onNav(tile.key)}
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
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{stats.active}</div>
            <div className="dash-stat-lbl">Pacientes Ativos</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-ico" style={{ background: 'rgba(5,150,105,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{stats.presenceRate}%</div>
            <div className="dash-stat-lbl">Taxa de Presença</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-ico" style={{ background: 'rgba(217,119,6,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{stats.todayDone}/{stats.todaySessions}</div>
            <div className="dash-stat-lbl">Sessões Hoje</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-ico" style={{ background: 'rgba(220,38,38,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{stats.pending}</div>
            <div className="dash-stat-lbl">Cobranças Abertas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
