'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type Step = 'dados' | 'senha' | 'confirmar' | 'invite';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('dados');
  const [form, setForm] = useState({ name: '', clinicName: '', email: '', phone: '', password: '', confirm: '' });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteConfirm, setInviteConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Detecta chegada via link de convite (Supabase seta sessão automaticamente)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        // Se o usuário veio via convite, ainda não tem senha — mostra form de criação de senha
        const meta = session.user.user_metadata;
        if (meta?.invited_at || !session.user.last_sign_in_at || step === 'dados') {
          setStep('invite');
        }
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInvitePassword(e: React.FormEvent) {
    e.preventDefault();
    if (invitePassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (invitePassword !== inviteConfirm) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password: invitePassword });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push('/dashboard');
  }

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError('Você deve aceitar os Termos de Uso para continuar'); return; }
    if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    if (!form.name || !form.email) { setError('Preencha todos os campos obrigatórios'); return; }

    setLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            clinic_name: form.clinicName || form.name,
            role: 'admin',
            phone: form.phone,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message === 'User already registered'
          ? 'Este e-mail já está cadastrado. Faça login.'
          : signUpError.message);
        return;
      }

      if (data.session) {
        router.push('/dashboard');
      } else {
        setStep('confirmar');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const STEPS = ['dados', 'senha'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div id="register" className="l-screen">
      {/* LEFT — visual side */}
      <div className="l-visual">
        <div className="lb lb1" />
        <div className="lb lb2" />
        <div className="lb lb3" />

        <div className="l-ripple-bg">
          <div className="l-rpl" />
          <div className="l-rpl" />
          <div className="l-rpl" />
          <div className="l-rpl" />
          <div className="l-rpl" />
          <div className="l-rpl" />
        </div>

        <div className="l-orb-wrap">
          <div className="l-orb" style={{'--r':'160px','--d':'14s','--dl':'0s'} as React.CSSProperties}>
            <div className="l-orb-inner">🧩</div>
          </div>
          <div className="l-orb l-orb-rev" style={{'--r':'230px','--d':'20s','--dl':'-7s'} as React.CSSProperties}>
            <div className="l-orb-inner">👨‍👩‍👦</div>
          </div>
          <div className="l-orb" style={{'--r':'310px','--d':'28s','--dl':'-14s'} as React.CSSProperties}>
            <div className="l-orb-inner">📈</div>
          </div>
        </div>

        <div className="l-visual-center">
          <div className="l-visual-art">
            <Image src="/logo.png" alt="ORYX" width={72} height={72} style={{ objectFit: 'contain', borderRadius: 14 }} />
          </div>
          <div className="l-visual-nm">14 dias grátis</div>
          <div className="l-visual-sub">Sem cartão de crédito · Cancele quando quiser</div>
          <div className="l-visual-divider" />
          <div className="l-visual-feats">
            {[
              { t: 'Prontuários e avaliações PEDI / SPM' },
              { t: 'PEI com 120+ atividades ABA' },
              { t: 'Agenda, financeiro e relatórios' },
              { t: 'Portal da família em tempo real' },
            ].map(f => (
              <div key={f.t} className="l-visual-feat">
                <span style={{ color: '#60A5FA', fontWeight: 700, flexShrink: 0 }}>✓</span>
                {f.t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — form side */}
      <div className="l-form-side">
        <div className="lbox">
          <div className="lbox-inner">
            <div className="l-brand">
              <div className="l-mark">
                <Image src="/logo.png" alt="ORYX" width={50} height={50} style={{ objectFit: 'contain', borderRadius: 8 }} />
              </div>
              <div>
                <div className="l-brand-name">ORYX</div>
                <div className="l-brand-tag">Criar conta grátis</div>
              </div>
            </div>

            {/* Progress dots */}
            {step !== 'confirmar' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                {STEPS.map((s, i) => (
                  <div key={s} style={{
                    height: 3, flex: 1, borderRadius: 99,
                    background: i <= stepIdx
                      ? 'linear-gradient(90deg,#0EA5E9,#8B5CF6)'
                      : 'rgba(255,255,255,.1)',
                    transition: 'background .3s',
                  }} />
                ))}
              </div>
            )}

            {step === 'dados' && (
              <form onSubmit={(e) => { e.preventDefault(); setStep('senha'); }}>
                <h1 className="l-title">Seus dados</h1>
                <p className="l-sub">Preencha as informações da sua clínica</p>

                <div className="l-field">
                  <label className="l-lbl">Nome completo *</label>
                  <input className="l-inp" type="text" placeholder="Ex: Ana Beatriz Santos"
                    value={form.name} onChange={e => update('name', e.target.value)} required autoFocus />
                </div>
                <div className="l-field">
                  <label className="l-lbl">Nome da clínica</label>
                  <input className="l-inp" type="text" placeholder="Ex: Clínica TEA Esperança"
                    value={form.clinicName} onChange={e => update('clinicName', e.target.value)} />
                </div>
                <div className="l-field">
                  <label className="l-lbl">E-mail *</label>
                  <input className="l-inp" type="email" placeholder="seu@email.com.br" autoComplete="email"
                    value={form.email} onChange={e => update('email', e.target.value)} required />
                </div>
                <div className="l-field">
                  <label className="l-lbl">WhatsApp</label>
                  <input className="l-inp" type="tel" placeholder="(11) 99999-9999" autoComplete="tel"
                    value={form.phone} onChange={e => update('phone', e.target.value)} />
                </div>

                <button type="submit" className="l-btn" style={{ width: '100%' }}>Continuar →</button>
              </form>
            )}

            {step === 'senha' && (
              <form onSubmit={handleRegister}>
                <h1 className="l-title">Criar senha</h1>
                <p className="l-sub">Escolha uma senha segura para sua conta</p>

                <div className="l-field">
                  <label className="l-lbl">Senha *</label>
                  <div style={{ position: 'relative' }}>
                    <input className="l-inp" type={showPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                      value={form.password} onChange={e => update('password', e.target.value)} required autoFocus style={{ paddingRight: 44 }} />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      {showPass
                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>
                <div className="l-field">
                  <label className="l-lbl">Confirmar senha *</label>
                  <input className="l-inp" type={showPass ? 'text' : 'password'} placeholder="Repita a senha" autoComplete="new-password"
                    value={form.confirm} onChange={e => update('confirm', e.target.value)} required />
                </div>

                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', margin: '4px 0 16px' }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    style={{ marginTop: 3, accentColor: '#3B82F6', width: 16, height: 16, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
                    Li e aceito os{' '}
                    <Link href="/termos" target="_blank" style={{ color: '#60A5FA', fontWeight: 600 }}>Termos de Uso</Link>
                    {' '}e a{' '}
                    <Link href="/privacidade" target="_blank" style={{ color: '#60A5FA', fontWeight: 600 }}>Política de Privacidade</Link>
                  </span>
                </label>

                {error && (
                  <div className="l-err">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="l-btn-out" onClick={() => setStep('dados')}>← Voltar</button>
                  <button type="submit" className="l-btn" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Criando conta...' : 'Criar conta grátis'}
                  </button>
                </div>
              </form>
            )}

            {step === 'confirmar' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg,rgba(59,130,246,.25),rgba(139,92,246,.25))',
                  border: '2px solid rgba(59,130,246,.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px', fontSize: 32,
                }}>✉️</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
                  Confirme seu e-mail
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, marginBottom: 28 }}>
                  Enviamos um link de confirmação para<br />
                  <strong style={{ color: '#60A5FA' }}>{form.email}</strong>
                  <br /><br />
                  Verifique sua caixa de entrada (e a pasta spam)
                  e clique no link para ativar sua conta.
                </p>
                <Link href="/login" className="l-btn" style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center' }}>
                  Ir para o login →
                </Link>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 16 }}>
                  Não recebeu?{' '}
                  <button type="button" disabled={resendState === 'sending'} onClick={async () => {
                    setResendState('sending');
                    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: form.email });
                    setResendState(resendError ? 'error' : 'sent');
                  }} style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: resendState === 'sending' ? 'default' : 'pointer', fontSize: 12, padding: 0, fontWeight: 600, opacity: resendState === 'sending' ? 0.6 : 1 }}>
                    {resendState === 'sending' ? 'Reenviando...' : 'Reenviar e-mail'}
                  </button>
                </p>
                {resendState === 'sent' && (
                  <p style={{ fontSize: 12, color: '#34D399', marginTop: 8 }}>E-mail reenviado com sucesso!</p>
                )}
                {resendState === 'error' && (
                  <p style={{ fontSize: 12, color: '#F87171', marginTop: 8 }}>Não foi possível reenviar. Tente novamente em instantes.</p>
                )}
              </div>
            )}

            {step === 'invite' && (
              <div>
                <h1 className="l-title">Criar sua senha</h1>
                <p className="l-sub">Você foi convidado! Escolha uma senha para acessar a plataforma.</p>
                <form onSubmit={handleInvitePassword}>
                  <div className="l-field">
                    <label className="l-lbl">Nova senha *</label>
                    <input className="l-inp" type="password" placeholder="Mínimo 6 caracteres"
                      value={invitePassword} onChange={e => { setInvitePassword(e.target.value); setError(''); }} required autoFocus />
                  </div>
                  <div className="l-field">
                    <label className="l-lbl">Confirmar senha *</label>
                    <input className="l-inp" type="password" placeholder="Repita a senha"
                      value={inviteConfirm} onChange={e => { setInviteConfirm(e.target.value); setError(''); }} required />
                  </div>
                  {error && (
                    <div className="l-err">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {error}
                    </div>
                  )}
                  <button type="submit" className="l-btn" disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Salvando...' : 'Acessar plataforma →'}
                  </button>
                </form>
              </div>
            )}

            {step !== 'confirmar' && step !== 'invite' && (
              <div className="l-ftr" style={{ marginTop: 20 }}>
                Já tem conta? <Link href="/login">Entrar</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
