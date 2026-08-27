'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppProvider, useApp } from '@/contexts/AppContext';
import type { Screen } from '@/lib/types';

import CrispChat from '@/components/ui/CrispChat';
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
import FornecedoresScreen from '@/components/dashboard/screens/FornecedoresScreen';

const SCREEN_META: Record<Screen, { title: string; sub: string }> = {
  dashboard: { title: 'Início', sub: 'Bem-vindo(a) ao ORYX' },
  pacientes: { title: 'Pacientes', sub: 'Cadastro e fichas individuais' },
  pei: { title: 'Atividades', sub: 'Programas e execução DTT' },
  avaliacoes: { title: 'Avaliações', sub: 'PEDI, SPM, ABLLS, VBMAPP' },
  questionarios: { title: 'Questionários', sub: 'M-CHAT-R, CARS, SDQ, SNAP-IV' },
  agenda: { title: 'Agenda', sub: 'Sessões e calendário' },
  financeiro: { title: 'Financeiro', sub: 'Contratos e pagamentos' },
  bi: { title: 'Evolução Clínica', sub: 'Indicadores e progresso clínico' },
  equipe: { title: 'Equipe', sub: 'Terapeutas e funcionários' },
  fornecedores: { title: 'Fornecedores', sub: 'Empresas e prestadores de serviço' },
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

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [notifOpen]);

  return (
    <div className="topbar">
      <div className="tb-l">
        <button className="tb-brand" onClick={() => onNav(user?.role === 'familia' ? 'portal' : 'dashboard')}>
          <div className="tb-mark-sm">
            <Image src="/logo.png" alt="ORYX" width={34} height={34} style={{ objectFit: 'contain', borderRadius: 6 }} />
          </div>
          <div className="tb-brand-txt">
            <span className="tb-brand-name">ORYX</span>
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
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="tb-btn"
            style={{ display: 'flex', gap: 6 }}
            onClick={() => setNotifOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={notifOpen}
            aria-label="Notificações"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="tb-lbl">Notificações</span>
          </button>
          {notifOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 240,
                background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12,
                boxShadow: 'var(--sh-lg)', padding: '14px 16px', zIndex: 300,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Notificações</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Nenhuma notificação no momento.</div>
            </div>
          )}
        </div>

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
          <span className="tb-lbl">Sair</span>
        </button>

        <button className="tb-avatar" onClick={() => onNav('conta')} title="Minha conta" aria-label="Minha conta">
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </button>
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
  fornecedores: ['admin', 'financeiro'],
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
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [dark, setDark] = useState(true);
  const viewApplied = useRef(false);

  // Navegação com guard de permissão
  const navigate = (s: Screen) => {
    if (canAccess(s, role)) setScreen(s);
  };

  useEffect(() => {
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

  // Uma vez: aplica a tela inicial baseada no role do banco + seleção do login
  useEffect(() => {
    if (!role || viewApplied.current) return;
    viewApplied.current = true;

    // Usuários familia sempre vão para portal (role do banco ganha)
    if (role === 'familia') { setScreen('portal'); return; }

    // Admin/terapeuta: respeita a seleção do formulário de login (?view=familia)
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'familia' && canAccess('portal', role)) {
      setScreen('portal');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [role]);

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
    fornecedores: <FornecedoresScreen />,
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
      <CrispChat />
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
