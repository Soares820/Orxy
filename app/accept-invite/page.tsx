'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type Status = 'idle' | 'verifying' | 'password' | 'saving' | 'error';

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenHash = params.get('token_hash') ?? '';
  const type = params.get('type') ?? 'invite';

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  async function handleAccept() {
    if (!tokenHash) { setError('Link inválido ou incompleto.'); setStatus('error'); return; }
    setStatus('verifying');
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (err) {
      setError(
        err.message.includes('expired') || err.message.includes('invalid')
          ? 'Este link já foi usado ou expirou. Peça para o administrador enviar um novo convite.'
          : err.message
      );
      setStatus('error');
      return;
    }
    setStatus('password');
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    setStatus('saving');
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setStatus('password'); return; }
    router.push('/dashboard');
  }

  return (
    <div id="login" className="l-screen">
      <div className="l-form-side" style={{ width: '100%' }}>
        <div className="lbox">
          <div className="lbox-inner">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
              <Image src="/logo.png" alt="ORYX" width={80} height={80} style={{ objectFit: 'contain', borderRadius: 14 }} />
            </div>

            {status === 'error' ? (
              <>
                <div className="l-title">Não foi possível aceitar o convite</div>
                <div className="l-err" style={{ marginTop: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
                <Link href="/login" className="l-btn" style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center', marginTop: 16 }}>
                  Ir para o login →
                </Link>
              </>
            ) : status === 'password' || status === 'saving' ? (
              <>
                <div className="l-title">Criar sua senha</div>
                <div className="l-sub">Convite aceito! Escolha uma senha para acessar a plataforma.</div>
                <form onSubmit={handleSetPassword} noValidate>
                  <div className="l-field">
                    <label className="l-lbl">Nova senha *</label>
                    <input className="l-inp" type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                      value={password} onChange={e => { setPassword(e.target.value); setError(''); }} required autoFocus />
                  </div>
                  <div className="l-field">
                    <label className="l-lbl">Confirmar senha *</label>
                    <input className="l-inp" type="password" placeholder="Repita a senha" autoComplete="new-password"
                      value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} required />
                  </div>
                  {error && (
                    <div className="l-err">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {error}
                    </div>
                  )}
                  <button type="submit" className="l-btn" disabled={status === 'saving'} style={{ width: '100%' }}>
                    {status === 'saving' ? 'Salvando...' : 'Acessar plataforma →'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="l-title">Você foi convidado!</div>
                <div className="l-sub">Clique abaixo para aceitar o convite e criar sua senha de acesso à ORYX.</div>

                <button
                  type="button"
                  className="l-btn"
                  disabled={status === 'verifying'}
                  onClick={handleAccept}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {status === 'verifying' ? 'Verificando...' : 'Aceitar convite →'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
