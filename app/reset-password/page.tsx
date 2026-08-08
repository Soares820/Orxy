'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type Mode = 'request' | 'sent' | 'update' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Informe seu e-mail'); return; }
    setLoading(true);
    setError('');
    try {
      // Usa API server-side para gerar link com redirectTo correto (bypassa allowlist do Supabase)
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Erro ao enviar e-mail');
    } catch {
      setError('Erro ao enviar e-mail. Tente novamente.');
      setLoading(false);
      return;
    }
    setLoading(false);
    setMode('sent');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setMode('done');
    setTimeout(() => router.push('/login'), 3000);
  }

  return (
    <div className="auth-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20, padding: '44px 40px',
        backdropFilter: 'blur(20px)',
        margin: '0 auto',
      }}>
        <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
          <div className="lp-logo-mark" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <Image src="/logo.svg" alt="T.O Plataforma" width={36} height={36} style={{ objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>T.O Plataforma</span>
        </Link>

        {mode === 'request' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Recuperar senha</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 28 }}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <form onSubmit={handleRequest}>
              <div className="af-group">
                <label className="af-label">E-mail</label>
                <input
                  className="af-input"
                  type="email"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
              {error && (
                <div className="af-error" style={{ marginBottom: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}
              <button type="submit" className="af-btn" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          </>
        )}

        {mode === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg,rgba(59,130,246,.2),rgba(139,92,246,.2))',
              border: '2px solid rgba(59,130,246,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 28,
            }}>✉️</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12 }}>E-mail enviado!</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: 28 }}>
              Verifique sua caixa de entrada em<br />
              <strong style={{ color: '#60A5FA' }}>{email}</strong>
              <br />e clique no link para redefinir sua senha.
            </p>
            <Link href="/login" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} className="af-btn">
              Voltar ao login
            </Link>
          </div>
        )}

        {mode === 'update' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Nova senha</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 28 }}>
              Escolha uma nova senha para sua conta.
            </p>
            <form onSubmit={handleUpdate}>
              <div className="af-group">
                <label className="af-label">Nova senha *</label>
                <input
                  className="af-input"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
              <div className="af-group">
                <label className="af-label">Confirmar nova senha *</label>
                <input
                  className="af-input"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                />
              </div>
              {error && (
                <div className="af-error" style={{ marginBottom: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}
              <button type="submit" className="af-btn" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}

        {mode === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,197,94,.15)',
              border: '2px solid rgba(34,197,94,.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 28,
            }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Senha alterada!</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginBottom: 28 }}>
              Sua senha foi atualizada com sucesso.<br />Redirecionando para o login...
            </p>
            <Link href="/login" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} className="af-btn">
              Ir para o login
            </Link>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,.35)' }}>
          <Link href="/login" style={{ color: '#60A5FA' }}>← Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
