'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppProvider, useApp } from '@/contexts/AppContext';
import type { Screen } from '@/lib/types';

import DashboardHome from '@/components/dashboard/screens/DashboardHome';
import PacientesScreen from '@/components/dashboard/screens/PacientesScreen';
import AgendaScreen from '@/components/dashboard/screens/AgendaScreen';
import FinanceiroScreen from '@/components/dashboard/screens/FinanceiroScreen';
import BiScreen from '@/components/dashboard/screens/BiScreen';
import EquipeScreen from '@/components/dashboard/screens/EquipeScreen';
import ReavixScreen from '@/components/dashboard/screens/ReavixScreen';
import PortalScreen from '@/components/dashboard/screens/PortalScreen';
import ContaScreen from '@/components/dashboard/screens/ContaScreen';
import PeiScreen from '@/components/dashboard/screens/PeiScreen';
import AvaliacoesScreen from '@/components/dashboard/screens/AvaliacoesScreen';
import QuestionariosScreen from '@/components/dashboard/screens/QuestionariosScreen';

const SCREEN_META: Record<Screen, { title: string; sub: string }> = {
  dashboard: { title: 'Início', sub: 'Bem-vindo(a) à plataforma T.O' },
  pacientes: { title: 'Pacientes', sub: 'Cadastro e fichas individuais' },
  pei: { title: 'Atividades', sub: 'Programas e execução DTT' },
  avaliacoes: { title: 'Avaliações', sub: 'PEDI, SPM, ABLLS, VBMAPP' },
  questionarios: { title: 'Questionários', sub: 'M-CHAT-R, CARS, SDQ, SNAP-IV' },
  agenda: { title: 'Agenda', sub: 'Sessões e calendário' },
  financeiro: { title: 'Financeiro', sub: 'Contratos e pagamentos' },
  bi: { title: 'Evolução Clínica', sub: 'Indicadores e progresso clínico' },
  equipe: { title: 'Equipe', sub: 'Terapeutas e funcionários' },
  reavix: { title: 'Assistente Clínico', sub: 'Suporte especializado ABA/TEA' },
  portal: { title: 'Portal Família', sub: 'Acompanhamento das famílias' },
  conta: { title: 'Minha Conta', sub: 'Configurações e plano' },
};

function Topbar({
  screen,
  onNav,
  dark,
  onToggleTheme,
}: {
  screen: Screen;
  onNav: (s: Screen) => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const { state, logout } = useApp();
  const user = state.user;
  const meta = SCREEN_META[screen];
  const isHome = screen === 'dashboard' || screen === 'portal';

  return (
    <div className="topbar">
      <div className="tb-l">
        <button className="tb-brand" onClick={() => onNav(user?.role === 'familia' ? 'portal' : 'dashboard')}>
          <div className="tb-mark-sm">
            <Image src="/logo.svg" alt="T.O" width={34} height={34} style={{ objectFit: 'contain' }} />
          </div>
          <div className="tb-brand-txt">
            <span className="tb-brand-name">T.O Plataforma</span>
            <span className="tb-brand-sub">{user?.role === 'familia' ? 'Sistema TEA' : 'Sistema Clínico'}</span>
          </div>
        </button>

        <div className="tb-div" />

        {!isHome && (
          <button className="tb-back" onClick={() => onNav(user?.role === 'familia' ? 'portal' : 'dashboard')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Início
          </button>
        )}

        <div>
          <div className="tb-title">{meta.title}</div>
          <div className="tb-sub">{meta.sub}</div>
        </div>
      </div>

      <div className="tb-r">
        <button className="tb-btn" style={{ display: 'flex', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          Notificações
        </button>

        <button
          className="tb-ico"
          onClick={onToggleTheme}
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        <button className="tb-btn" onClick={logout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>

        <div className="tb-avatar" onClick={() => onNav('conta')} title="Minha conta">
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </div>
  );
}

const SCREEN_ROLES: Record<Screen, string[]> = {
  dashboard:    ['admin', 'terapeuta', 'recepcao', 'financeiro'],
  pacientes:    ['admin', 'terapeuta', 'recepcao'],
  pei:          ['admin', 'terapeuta'],
  avaliacoes:   ['admin', 'terapeuta'],
  questionarios:['admin', 'terapeuta'],
  agenda:       ['admin', 'terapeuta', 'recepcao'],
  financeiro:   ['admin', 'financeiro'],
  bi:           ['admin', 'financeiro'],
  equipe:       ['admin'],
  reavix:       ['admin', 'terapeuta'],
  portal:       ['admin', 'terapeuta', 'familia'],
  conta:        ['admin', 'terapeuta', 'recepcao', 'financeiro'],
};

function canAccess(s: Screen, role: string | undefined): boolean {
  if (!role) return false;
  return (SCREEN_ROLES[s] ?? ['admin']).includes(role);
}

function AppShell() {
  const { state } = useApp();
  const router = useRouter();
  const role = state.user?.role;
  const [screen, setScreen] = useState<Screen>(
    role === 'familia' ? 'portal' : 'dashboard'
  );
  const [dark, setDark] = useState(true);

  // Navegação com guard de permissão
  const navigate = (s: Screen) => {
    if (canAccess(s, role)) setScreen(s);
  };

  useEffect(() => {
    // Lê ?portal=1 na URL e abre portal familiar, depois limpa o param
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === '1') {
      setScreen('portal');
      window.history.replaceState({}, '', '/dashboard');
    }
    const saved = localStorage.getItem('theme');
    const isDark = saved !== 'light';
    setDark(isDark);
    document.body.setAttribute('data-theme', isDark ? 'dark' : '');
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.body.setAttribute('data-theme', next ? 'dark' : '');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (state.initialized && !state.user) {
      router.replace('/login');
    }
  }, [state.initialized, state.user, router]);

  // Redireciona se tela ativa não permitida para o role atual
  useEffect(() => {
    if (!role) return;
    if (role === 'familia' && screen !== 'portal') { setScreen('portal'); return; }
    if (!canAccess(screen, role)) setScreen('dashboard');
  }, [role, screen]);

  if (!state.initialized || state.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
        <div className="spin-anim" style={{ width: 36, height: 36, border: '3px solid var(--bdr)', borderTopColor: 'var(--p)', borderRadius: '50%' }} />
        <div style={{ color: 'var(--t3)', fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  if (!state.user) return null;

  const SCREENS: Record<Screen, React.ReactNode> = {
    dashboard: <DashboardHome onNav={navigate} />,
    pacientes: <PacientesScreen />,
    pei: <PeiScreen />,
    avaliacoes: <AvaliacoesScreen />,
    questionarios: <QuestionariosScreen />,
    agenda: <AgendaScreen />,
    financeiro: <FinanceiroScreen />,
    bi: <BiScreen />,
    equipe: <EquipeScreen />,
    reavix: <ReavixScreen />,
    portal: <PortalScreen onNav={navigate} />,
    conta: <ContaScreen />,
  };

  return (
    <div className="app-layout">
      <div className="main-area">
        <Topbar
          screen={screen}
          onNav={navigate}
          dark={dark}
          onToggleTheme={toggleTheme}
        />
        <div className="screen-content">
          {SCREENS[screen]}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
