'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './blog.css';

interface BlogPost {
  id: number;
  titulo: string;
  resumo: string;
  conteudo: string;
  categoria: string;
  tags: string[];
  fonte: string;
  fonte_url: string | null;
  publicado_em: string;
}

const CATEGORIES = ['Todos', 'Pesquisa', 'ABA', 'Terapia Ocupacional', 'TEA', 'Família'];

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BlogPost | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setError('Configuração inválida'); setLoading(false); return; }
    fetch(`${url}/rest/v1/blog_posts?select=*&order=publicado_em.desc&limit=50`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    })
      .then((r) => { if (!r.ok) throw new Error('Erro ao carregar'); return r.json(); })
      .then((data) => { setPosts(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let p = posts;
    if (filter !== 'Todos') p = p.filter((x) => x.categoria === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      p = p.filter((x) =>
        x.titulo?.toLowerCase().includes(q) ||
        x.resumo?.toLowerCase().includes(q) ||
        x.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return p;
  }, [posts, filter, search]);

  return (
    <>
      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="ORYX" width={36} height={36} style={{ borderRadius: 10, overflow: 'hidden' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.3px' }}>ORYX</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--accent)', letterSpacing: '.5px', textTransform: 'uppercase' }}>Blog Científico</div>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>← Início</Link>
          <Link href="/login" style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Acessar Plataforma</Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ padding: '60px 24px 40px', textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--tag)', color: 'var(--tag-text)', fontSize: 11, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 20, marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', animation: 'pulse 2s infinite', display: 'inline-block' }} />
          Atualizado diariamente
        </div>
        <h1 style={{ fontSize: 'clamp(26px,5vw,40px)', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.5px', marginBottom: 14 }}>Pesquisas em ABA &amp; Terapia Ocupacional</h1>
        <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7 }}>Artigos científicos internacionais traduzidos e contextualizados para a prática clínica brasileira em TEA.</p>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', maxWidth: 1100, margin: '0 auto 32px', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{ border: '1px solid', borderColor: filter === cat ? 'var(--accent)' : 'var(--border)', color: filter === cat ? 'var(--accent)' : 'var(--muted)', background: filter === cat ? 'rgba(59,130,246,.08)' : 'none', padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' } as React.CSSProperties}
          >
            {cat === 'Terapia Ocupacional' ? 'T.O' : cat}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <input
            type="search"
            placeholder="Buscar artigos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', width: 220, outline: 'none' }}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '0 24px', maxWidth: 1100, margin: '0 auto 60px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>Carregando artigos...</div>
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, opacity: .4 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>Erro ao carregar artigos</div>
            <div style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.6 }}>{error}. Tente recarregar a página.</div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, opacity: .4 }}>📰</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>Nenhum artigo encontrado</div>
            <div style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.6 }}>Tente outro filtro ou aguarde a atualização de amanhã com novos conteúdos.</div>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: '.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '14px 18px 0', color: 'var(--tag-text)' }}>{p.categoria || 'Pesquisa'}</div>
                <div style={{ padding: '10px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{p.titulo}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 } as React.CSSProperties}>{p.resumo}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(p.publicado_em)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>📚 {(p.fonte || 'PubMed').split('—')[0].trim()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {(p.tags || []).slice(0, 2).map((t) => (
                      <span key={t} style={{ background: 'var(--tag)', color: 'var(--tag-text)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, letterSpacing: '.3px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 24px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
        <p>Conteúdo gerado automaticamente com base em publicações do <a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none' }}>PubMed</a>, sumarizado por IA e contextualizado para a realidade brasileira. Não substitui orientação clínica profissional.</p>
        <p style={{ marginTop: 8 }}><Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>ORYX</Link> · <Link href="/wiki" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Manual</Link></p>
      </footer>

      {/* MODAL */}
      {selected && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}
        >
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 700, width: '100%', margin: 'auto', animation: 'fadeUp .25s ease' }}>
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--tag-text)', marginBottom: 10 }}>{selected.categoria || 'Pesquisa'}</div>
                <div style={{ fontSize: 'clamp(18px,4vw,24px)', fontWeight: 800, lineHeight: 1.3, color: 'var(--text)' }}>{selected.titulo}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 28px', fontSize: 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span>📅 {formatDate(selected.publicado_em)}</span>
              <span>📚 {selected.fonte || 'PubMed'}</span>
            </div>
            <div style={{ padding: '24px 28px', fontSize: 15, lineHeight: 1.8, color: 'var(--text)' }}>
              {(selected.conteudo || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
                <p key={i} style={{ marginBottom: 16 }}>{para.trim()}</p>
              ))}
            </div>
            <div style={{ padding: '16px 28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(selected.tags || []).map((t) => (
                  <span key={t} style={{ background: 'var(--tag)', color: 'var(--tag-text)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12 }}>{t}</span>
                ))}
              </div>
              {selected.fonte_url && (
                <a href={selected.fonte_url} target="_blank" rel="noopener" style={{ background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '7px 16px', borderRadius: 8, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Ver artigo original
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
