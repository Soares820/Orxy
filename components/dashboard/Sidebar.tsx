'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/contexts/AppContext';
import type { Screen } from '@/lib/types';

const ALL_NAV = [
  {
    section: 'Gestão',
    roles: ['admin', 'terapeuta', 'recepcao'],
    items: [
      { key: 'dashboard', label: 'Dashboard', roles: ['admin', 'terapeuta', 'recepcao', 'financeiro'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
      { key: 'pacientes', label: 'Pacientes', roles: ['admin', 'terapeuta', 'recepcao'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
      { key: 'pei', label: 'Atividades', roles: ['admin', 'terapeuta'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
      { key: 'avaliacoes', label: 'Avaliações', roles: ['admin', 'terapeuta'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
      { key: 'questionarios', label: 'Questionários', roles: ['admin', 'terapeuta'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
      { key: 'agenda', label: 'Agenda', roles: ['admin', 'terapeuta', 'recepcao'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    ],
  },
  {
    section: 'Financeiro & BI',
    roles: ['admin', 'financeiro'],
    items: [
      { key: 'financeiro', label: 'Financeiro', roles: ['admin', 'financeiro'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
      { key: 'bi', label: 'Evolução Clínica', roles: ['admin', 'financeiro'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    ],
  },
  {
    section: 'Ferramentas',
    roles: ['admin', 'terapeuta'],
    items: [
      { key: 'equipe', label: 'Equipe', roles: ['admin'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
      { key: 'reavix', label: 'Assistente Clínico', roles: ['admin', 'terapeuta'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
      { key: 'portal', label: 'Portal Família', roles: ['admin', 'terapeuta', 'familia'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> },
    ],
  },
];

interface SidebarProps {
  active: Screen;
  onNav: (screen: Screen) => void;
  dark?: boolean;
  onToggleTheme?: () => void;
}

export default function Sidebar({ active, onNav, dark, onToggleTheme }: SidebarProps) {
  const { state, logout } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const user = state.user;
  const role = user?.role ?? 'terapeuta';

  // For familia role, only show portal
  const navSections = role === 'familia'
    ? [{ section: 'Portal', roles: ['familia'], items: [{ key: 'portal', label: 'Portal Família', roles: ['familia'], icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> }] }]
    : ALL_NAV.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      })).filter((section) => section.items.length > 0);

  return (
    <aside className={`sidebar${collapsed ? ' sb-col' : ''}`} id="sb">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-mark">
          <Image src="/logo.png" alt="ORYX" width={40} height={40} style={{ objectFit: 'contain', borderRadius: 8 }} />
        </div>
        <div className="sb-info">
          <div className="sb-name">{user?.clinicName || 'Software ABA'}</div>
          <div className="sb-sub">{user?.plan === 'trial' ? 'Trial' : user?.plan}</div>
        </div>
        <button className="sb-toggle" onClick={() => setCollapsed(!collapsed)} id="sb-tgl">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <polyline points={collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <div className="nav-scroll">
        {navSections.map((section) => (
          <div key={section.section}>
            <div className="nb-sec">{section.section}</div>
            {section.items.map((item) => (
              <button
                key={item.key}
                className={`nav-item${active === item.key ? ' active' : ''}`}
                onClick={() => onNav(item.key as Screen)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-lbl">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User / bottom area */}
      <div className="sb-foot">
        <button
          className="sb-item"
          id="sb-conta-btn"
          onClick={() => onNav('conta')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', borderRadius: 10, background: active === 'conta' ? 'var(--ps)' : 'none', color: active === 'conta' ? 'var(--p)' : 'var(--t2)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          <div className="sb-av" style={{ background: 'linear-gradient(135deg,var(--p),var(--v))' }}>
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Usuário'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </button>

        <div style={{ display: 'flex', gap: 4, padding: '4px 16px 8px' }}>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={dark ? 'Modo claro' : 'Modo escuro'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, background: 'none', border: '1px solid var(--bdr)', color: 'var(--t3)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {dark
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
              {dark ? 'Claro' : 'Escuro'}
            </button>
          )}
          <button
            onClick={logout}
            title="Sair"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, background: 'none', border: '1px solid var(--bdr)', color: 'var(--t3)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
