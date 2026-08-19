'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function SupportChat() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [unread, setUnread] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(false);
      textRef.current?.focus();
    }
  }, [open]);

  async function handleSend() {
    if (!msg.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg.trim(),
          user: state.user?.name ?? 'Usuário',
          email: state.user?.email ?? '',
          clinic: state.user?.clinicName ?? '',
        }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
      setMsg('');
    } catch {
      setStatus('error');
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const user = state.user;

  return (
    <>
      {/* Painel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 9999,
          width: 340, borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,.45)',
          background: 'var(--sf)', border: '1px solid var(--bdr)',
          display: 'flex', flexDirection: 'column',
          animation: 'chatSlideUp .22s cubic-bezier(.34,1.56,.64,1)',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)',
            padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Suporte ORXY</div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 12, marginTop: 1 }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#4ade80', marginRight: 5 }} />
                Online — resposta em minutos
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Corpo */}
          <div style={{ padding: '20px 20px 0', flex: 1 }}>
            {status === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                  margin: '0 auto 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--t1)', marginBottom: 6 }}>Mensagem enviada!</div>
                <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>Nossa equipe vai entrar em contato em breve pelo seu email.</div>
                <button onClick={() => setStatus('idle')} style={{
                  marginTop: 16, padding: '8px 20px', borderRadius: 10,
                  background: 'var(--sf2)', border: '1px solid var(--bdr)',
                  color: 'var(--t2)', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                }}>Nova mensagem</button>
              </div>
            ) : (
              <>
                <div style={{
                  background: 'var(--sf2)', borderRadius: 14, padding: '14px 16px',
                  marginBottom: 14, fontSize: 13, color: 'var(--t2)', lineHeight: 1.6,
                  borderLeft: '3px solid #2563EB',
                }}>
                  Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋 Como posso ajudar você hoje?
                </div>
                <textarea
                  ref={textRef}
                  value={msg}
                  onChange={e => { setMsg(e.target.value); if (status === 'error') setStatus('idle'); }}
                  onKeyDown={handleKey}
                  placeholder="Descreva sua dúvida ou problema..."
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px', borderRadius: 12, resize: 'none',
                    border: '1.5px solid var(--bdr)', background: 'var(--bg)',
                    color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit',
                    outline: 'none', lineHeight: 1.5,
                  }}
                />
                {status === 'error' && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                    Erro ao enviar. Tente novamente.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {status !== 'sent' && (
            <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={handleSend}
                disabled={!msg.trim() || status === 'sending'}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                  background: msg.trim() ? 'linear-gradient(135deg,#2563EB,#7C3AED)' : 'var(--sf2)',
                  color: msg.trim() ? '#fff' : 'var(--t3)',
                  fontWeight: 700, fontSize: 14, cursor: msg.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all .2s',
                }}
              >
                {status === 'sending' ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Enviar mensagem
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: open
            ? 'linear-gradient(135deg,#4f46e5,#7C3AED)'
            : 'linear-gradient(135deg,#2563EB,#7C3AED)',
          boxShadow: '0 8px 32px rgba(37,99,235,.5)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .2s, box-shadow .2s',
          transform: open ? 'rotate(0deg) scale(1.05)' : 'rotate(0deg)',
        }}
        title="Suporte"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )}
        {unread && (
          <div style={{
            position: 'absolute', top: 2, right: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#ef4444', border: '2px solid var(--bg)',
          }} />
        )}
      </button>

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
