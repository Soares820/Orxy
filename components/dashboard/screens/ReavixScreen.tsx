'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { escHtml } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const QUICK_PROMPTS = [
  'Crie um programa ABA para controle de comportamento disruptivo',
  'Sugira atividades de integração sensorial para crianças TEA',
  'Como documentar evolução no PEI de forma clara e objetiva?',
  'Elabore um relatório de progresso mensal para família',
  'Quais objetivos de Comunicação Funcional incluir no PEI?',
  'Técnicas ABA para ensinar habilidades de autocuidado',
];

export default function ReavixScreen() {
  const { state } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/reavix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: msg, history }),
      });

      if (!res.ok) throw new Error('Erro na resposta');
      const json = await res.json();
      const reply = json.response ?? 'Desculpe, não consegui processar sua pergunta.';

      setMessages((prev) => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function formatContent(text: string) {
    // Escapa HTML antes de aplicar as substituições de markdown simples,
    // já que o conteúdo (incluindo resposta da IA) é renderizado via dangerouslySetInnerHTML
    return escHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--sf2);padding:2px 5px;border-radius:4px;font-family:monospace;font-size:0.88em">$1</code>')
      .replace(/\n/g, '<br>');
  }

  return (
    <div className="view show" id="v-reavix" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--bdr)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>Assistente Clínico</h1>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>Suporte especializado em ABA e Terapia Ocupacional para TEA</div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} style={{ marginLeft: 'auto', padding: '6px 14px', border: '1px solid var(--bdr)', borderRadius: 8, background: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Nova conversa
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {messages.length === 0 ? (
          <div style={{ maxWidth: 580, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', marginBottom: 8 }}>Assistente Clínico</div>
              <div style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.6 }}>
                Especialista em ABA e Terapia Ocupacional para TEA. Posso ajudar com planos terapêuticos, programas de intervenção, relatórios e muito mais.
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>Sugestões de perguntas:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{ textAlign: 'left', padding: '12px 16px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.5, transition: '.15s' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m) => (
              <div key={m.ts} style={{ display: 'flex', gap: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: m.role === 'user' ? 'linear-gradient(135deg,var(--p),var(--v))' : 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 13, fontWeight: 700 }}>
                  {m.role === 'user' ? (state.user?.name?.charAt(0)?.toUpperCase() ?? 'U') : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  )}
                </div>
                <div style={{ maxWidth: '78%', background: m.role === 'user' ? 'var(--ps)' : 'var(--sf)', border: `1px solid ${m.role === 'user' ? 'var(--p)' : 'var(--bdr)'}`, borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding: '12px 16px', fontSize: 14, color: 'var(--t1)', lineHeight: 1.65 }}
                  dangerouslySetInnerHTML={{ __html: formatContent(m.content) }}
                />
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--p)', animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid var(--bdr)', flexShrink: 0 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = textareaRef.current;
              if (el) {
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }
            }}
            onKeyDown={handleKey}
            placeholder="Pergunte sobre ABA, TEA, programas terapêuticos... (Enter para enviar)"
            rows={1}
            style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--bdr)', borderRadius: 12, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{ padding: '12px 18px', background: !input.trim() || loading ? 'var(--bdr)' : 'var(--p)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: '.2s', flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={{ maxWidth: 700, margin: '6px auto 0', fontSize: 10, color: 'var(--t3)', textAlign: 'center' }}>
          Reavix usa IA generativa. Revise sempre o conteúdo antes de usar clinicamente.
        </div>
      </div>
    </div>
  );
}
