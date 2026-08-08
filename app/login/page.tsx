'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'clinic' | 'family'>('clinic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('E-mail e senha são obrigatórios.'); return; }
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos'
        : authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div id="login" className="l-screen">

      {/* LEFT — visual animado */}
      <div className="l-visual">
        <div className="lb lb1" />
        <div className="lb lb2" />
        <div className="lb lb3" />

        {/* Ripple circles */}
        <div className="l-ripple-bg">
          <div className="l-rpl" /><div className="l-rpl" /><div className="l-rpl" />
          <div className="l-rpl" /><div className="l-rpl" /><div className="l-rpl" />
        </div>

        {/* Orbiting SVG icons */}
        <div className="l-orb-wrap">
          <div className="l-orb" style={{'--r':'140px','--d':'22s','--dl':'0s'} as React.CSSProperties}>
            <div className="l-orb-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="13" height="13" rx="2"/><path d="M5 7H4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-1"/>
              </svg>
            </div>
          </div>
          <div className="l-orb l-orb-rev" style={{'--r':'140px','--d':'22s','--dl':'-11s'} as React.CSSProperties}>
            <div className="l-orb-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
          </div>
          <div className="l-orb" style={{'--r':'200px','--d':'30s','--dl':'-8s'} as React.CSSProperties}>
            <div className="l-orb-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
          </div>
          <div className="l-orb l-orb-rev" style={{'--r':'200px','--d':'30s','--dl':'-20s'} as React.CSSProperties}>
            <div className="l-orb-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
          </div>
          <div className="l-orb" style={{'--r':'260px','--d':'38s','--dl':'-5s'} as React.CSSProperties}>
            <div className="l-orb-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
          </div>
          <div className="l-orb l-orb-rev" style={{'--r':'260px','--d':'38s','--dl':'-22s'} as React.CSSProperties}>
            <div className="l-orb-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="l-visual-center">
          <div className="l-visual-art">
            <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="cg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity=".35"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <ellipse cx="100" cy="80" rx="78" ry="58" fill="url(#cg)"/>
              <circle cx="100" cy="80" r="30" fill="rgba(59,130,246,.22)" stroke="rgba(99,160,255,.55)" strokeWidth="1.5"/>
              <circle cx="100" cy="80" r="21" fill="rgba(59,130,246,.32)"/>
              <circle cx="100" cy="74" r="8" fill="#93C5FD"/>
              <path d="M86 93c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round"/>
              {/* Satellite: BI */}
              <circle cx="28" cy="26" r="19" fill="rgba(59,130,246,.13)" stroke="rgba(99,160,255,.3)" strokeWidth="1"/>
              <polyline points="19,31 23,24 28,28 33,20 38,24" stroke="#7DD3FC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Satellite: Família */}
              <circle cx="172" cy="26" r="19" fill="rgba(59,130,246,.13)" stroke="rgba(99,160,255,.3)" strokeWidth="1"/>
              <circle cx="166" cy="22" r="5" stroke="#7DD3FC" strokeWidth="1.5"/>
              <circle cx="178" cy="22" r="5" stroke="#7DD3FC" strokeWidth="1.5"/>
              <path d="M159 34c0-3.9 3.1-7 7-7" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M171 34c0-3.9 3.1-7 7-7" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Satellite: Relatórios */}
              <circle cx="28" cy="134" r="19" fill="rgba(59,130,246,.13)" stroke="rgba(99,160,255,.3)" strokeWidth="1"/>
              <rect x="20" y="126" width="16" height="16" rx="2.5" stroke="#7DD3FC" strokeWidth="1.5"/>
              <line x1="24" y1="131" x2="32" y2="131" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="24" y1="135" x2="30" y2="135" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="24" y1="139" x2="28" y2="139" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Satellite: PEI/Agenda */}
              <circle cx="172" cy="134" r="19" fill="rgba(59,130,246,.13)" stroke="rgba(99,160,255,.3)" strokeWidth="1"/>
              <rect x="164" y="126" width="16" height="16" rx="2.5" stroke="#7DD3FC" strokeWidth="1.5"/>
              <line x1="168" y1="126" x2="168" y2="122" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="176" y1="126" x2="176" y2="122" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="164" y1="132" x2="180" y2="132" stroke="#7DD3FC" strokeWidth="1.5"/>
              {/* Connection lines */}
              <line x1="45" y1="38" x2="75" y2="60" stroke="rgba(99,160,255,.4)" strokeWidth="1.2" strokeDasharray="5 4"/>
              <line x1="155" y1="38" x2="125" y2="60" stroke="rgba(99,160,255,.4)" strokeWidth="1.2" strokeDasharray="5 4"/>
              <line x1="45" y1="122" x2="75" y2="100" stroke="rgba(99,160,255,.4)" strokeWidth="1.2" strokeDasharray="5 4"/>
              <line x1="155" y1="122" x2="125" y2="100" stroke="rgba(99,160,255,.4)" strokeWidth="1.2" strokeDasharray="5 4"/>
              {/* Pulse dots */}
              <circle cx="60" cy="49" r="3" fill="#3B82F6" opacity=".7"/>
              <circle cx="140" cy="49" r="3" fill="#3B82F6" opacity=".7"/>
              <circle cx="60" cy="111" r="3" fill="#3B82F6" opacity=".7"/>
              <circle cx="140" cy="111" r="3" fill="#3B82F6" opacity=".7"/>
            </svg>
          </div>
          <div className="l-visual-nm">T.O Plataforma</div>
          <div className="l-visual-sub">Gestão clínica para clínicas de TEA</div>
          <div className="l-visual-divider" />
          <div className="l-visual-feats">
            {[
              'PEI e avaliações PEDI / PS / SPM',
              'BI clínico e relatórios PDF',
              'Portal familiar incluso',
            ].map(t => (
              <div key={t} className="l-visual-feat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — formulário */}
      <div className="l-form-side">
        <div className="lbox">
          <div className="lbox-inner">
            {/* Logo centrado */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
              <Image src="/logo.svg" alt="Software para Terapia ABA" width={80} height={80} style={{ objectFit: 'contain' }} />
            </div>

            <div className="l-title">Bem-vindo de volta</div>
            <div className="l-sub">Acesse a plataforma com suas credenciais e selecione o perfil de acesso.</div>

            {error && (
              <div className="l-err" style={{ marginBottom: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} noValidate>
              <div className="l-field">
                <label className="l-lbl">E-mail</label>
                <input
                  type="email"
                  className="l-inp"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="l-field">
                <label className="l-lbl">Senha</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="l-inp"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    autoComplete="current-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {showPass
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Tipo de acesso */}
              <div className="l-role-lbl" style={{ marginBottom: 10 }}>Tipo de acesso</div>
              <div className="l-roles">
                <button
                  type="button"
                  className={`l-role${role === 'family' ? ' active' : ''}`}
                  onClick={() => setRole('family')}
                >
                  <div className="l-check">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div className="l-rico">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <div className="l-rlbl">Família</div>
                  <div className="l-rsub">Pai, mãe, responsável</div>
                </button>

                <button
                  type="button"
                  className={`l-role${role === 'clinic' ? ' active' : ''}`}
                  onClick={() => setRole('clinic')}
                >
                  <div className="l-check">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div className="l-rico">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>
                    </svg>
                  </div>
                  <div className="l-rlbl">Clínica</div>
                  <div className="l-rsub">Terapeuta, equipe</div>
                </button>
              </div>

              <button type="submit" className="l-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Entrando...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Entrar
                  </>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <Link href="/reset-password" style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', textDecoration: 'none' }}>
                Esqueci minha senha
              </Link>
              <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 11 }}>|</span>
              <Link href="/register" style={{ fontSize: 12, color: '#60A5FA', fontWeight: 600, textDecoration: 'none' }}>
                Criar conta grátis →
              </Link>
            </div>

            <div className="l-ftr">
              © 2026 Software para Terapia ABA ·{' '}
              <Link href="/termos" style={{ color: 'rgba(255,255,255,.3)' }}>Termos de Uso</Link>
              {' '}·{' '}
              <Link href="/privacidade" style={{ color: 'rgba(255,255,255,.3)' }}>Privacidade</Link>
              {' '}·{' '}
              <Link href="/wiki" style={{ color: 'rgba(255,255,255,.3)' }}>Manual</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
