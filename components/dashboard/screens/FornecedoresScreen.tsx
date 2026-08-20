'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import type { Fornecedor } from '@/lib/types';

const CATEGORIAS: { key: Fornecedor['categoria']; label: string; emoji: string }[] = [
  { key: 'energia',       label: 'Energia',        emoji: '⚡' },
  { key: 'agua',          label: 'Água/Saneamento', emoji: '💧' },
  { key: 'telefone',      label: 'Telefone/Internet',emoji: '📡' },
  { key: 'internet',      label: 'Internet',        emoji: '🌐' },
  { key: 'aluguel',       label: 'Aluguel/Imóvel',  emoji: '🏢' },
  { key: 'material',      label: 'Material',        emoji: '📦' },
  { key: 'contabilidade', label: 'Contabilidade',   emoji: '📊' },
  { key: 'juridico',      label: 'Jurídico',        emoji: '⚖️' },
  { key: 'manutencao',    label: 'Manutenção',      emoji: '🔧' },
  { key: 'equipamentos',  label: 'Equipamentos',    emoji: '🖥️' },
  { key: 'software',      label: 'Software/TI',     emoji: '💻' },
  { key: 'folha',         label: 'Folha/RH',        emoji: '👥' },
  { key: 'outros',        label: 'Outros',           emoji: '📋' },
];

const emptyForm = {
  nome: '', cnpj: '', cpf: '', categoria: 'outros' as Fornecedor['categoria'],
  email: '', telefone: '', contato: '', endereco: '', notas: '',
};

const s = (base: React.CSSProperties) => base;

export default function FornecedoresScreen() {
  const { state, dispatch } = useApp();
  const clinicId = state.user?.clinicId ?? '';
  const fornecedores = state.data.fornecedores ?? [];

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const filtered = useMemo(() => {
    let list = fornecedores.filter(f => f.status === 'ativo');
    if (catFilter !== 'todos') list = list.filter(f => f.categoria === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.nome.toLowerCase().includes(q) ||
        (f.cnpj ?? '').includes(q) ||
        (f.contato ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [fornecedores, search, catFilter]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setSaveErr('');
    setShowModal(true);
  }

  function openEdit(f: Fornecedor) {
    setEditing(f);
    setForm({
      nome: f.nome, cnpj: f.cnpj ?? '', cpf: f.cpf ?? '',
      categoria: f.categoria, email: f.email ?? '',
      telefone: f.telefone ?? '', contato: f.contato ?? '',
      endereco: f.endereco ?? '', notas: f.notas ?? '',
    });
    setSaveErr('');
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true); setSaveErr('');
    try {
      if (editing) {
        const { data, error } = await supabase.from('fornecedores')
          .update({ ...form, nome: form.nome.trim() })
          .eq('id', editing.id).select().single();
        if (error) throw error;
        dispatch({ type: 'SET_DATA', payload: { fornecedores: fornecedores.map(f => f.id === editing.id ? data as Fornecedor : f) } });
      } else {
        const { data, error } = await supabase.from('fornecedores')
          .insert({ ...form, nome: form.nome.trim(), clinic_id: clinicId, status: 'ativo' })
          .select().single();
        if (error) throw error;
        dispatch({ type: 'SET_DATA', payload: { fornecedores: [...fornecedores, data as Fornecedor] } });
      }
      setShowModal(false);
    } catch (err: unknown) {
      setSaveErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function handleDelete(f: Fornecedor) {
    if (!confirm(`Remover "${f.nome}"?`)) return;
    await supabase.from('fornecedores').update({ status: 'inativo' }).eq('id', f.id);
    dispatch({ type: 'SET_DATA', payload: { fornecedores: fornecedores.filter(x => x.id !== f.id) } });
  }

  const catInfo = (key: string) => CATEGORIAS.find(c => c.key === key) ?? CATEGORIAS[CATEGORIAS.length - 1];

  const inp = s({ width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: '1.5px solid var(--bdr)', borderRadius: 10, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', outline: 'none' });
  const lbl = s({ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '.07em' });

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--t1)', margin: 0 }}>Fornecedores</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: '4px 0 0' }}>Empresas e prestadores de serviço da clínica</p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--p),var(--v))', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo fornecedor
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar fornecedor..." style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
          <option value="todos">Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
        </select>
      </div>

      {/* Stats rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', val: fornecedores.filter(f=>f.status==='ativo').length, color: '#3b82f6' },
          { label: 'Serviços', val: fornecedores.filter(f=>['energia','agua','telefone','internet','aluguel','software','manutencao'].includes(f.categoria)).length, color: '#8b5cf6' },
          { label: 'Material', val: fornecedores.filter(f=>['material','equipamentos'].includes(f.categoria)).length, color: '#10b981' },
          { label: 'Administrativo', val: fornecedores.filter(f=>['contabilidade','juridico','folha'].includes(f.categoria)).length, color: '#f59e0b' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: item.color }}>{item.val}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t2)', marginBottom: 6 }}>Nenhum fornecedor cadastrado</div>
          <div style={{ fontSize: 13 }}>Adicione empresas como COPEL, contabilista, fornecedores de material, etc.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
          {filtered.map(f => {
            const cat = catInfo(f.categoria);
            return (
              <div key={f.id} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--sf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cat.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{f.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--p)', fontWeight: 600, marginTop: 2 }}>{cat.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(f)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--sf2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(f)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                  {f.cnpj && <div style={{ color: 'var(--t3)' }}><span style={{ color: 'var(--t2)', fontWeight: 600 }}>CNPJ:</span> {f.cnpj}</div>}
                  {f.telefone && <div style={{ color: 'var(--t3)' }}><span style={{ color: 'var(--t2)', fontWeight: 600 }}>Tel:</span> {f.telefone}</div>}
                  {f.email && <div style={{ color: 'var(--t3)', gridColumn: '1/-1' }}><span style={{ color: 'var(--t2)', fontWeight: 600 }}>Email:</span> {f.email}</div>}
                  {f.contato && <div style={{ color: 'var(--t3)', gridColumn: '1/-1' }}><span style={{ color: 'var(--t2)', fontWeight: 600 }}>Contato:</span> {f.contato}</div>}
                </div>
                {f.notas && <div style={{ fontSize: 12, color: 'var(--t3)', background: 'var(--sf2)', borderRadius: 8, padding: '8px 10px' }}>{f.notas}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--sf)', borderRadius: 20, width: '100%', maxWidth: 560, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }}>
            <div style={{ background: 'linear-gradient(135deg,var(--p),var(--v))', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{editing ? 'Editar fornecedor' : 'Novo fornecedor'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nome *</label>
                <input required value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: COPEL, Contabilista Silva..." style={inp}/>
              </div>
              <div>
                <label style={lbl}>Categoria *</label>
                <select value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value as Fornecedor['categoria']}))} style={{ ...inp, cursor: 'pointer' }}>
                  {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>CNPJ</label>
                  <input value={form.cnpj} onChange={e => setForm(f=>({...f,cnpj:e.target.value}))} placeholder="00.000.000/0001-00" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>CPF (pessoa física)</label>
                  <input value={form.cpf} onChange={e => setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={inp}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Telefone</label>
                  <input value={form.telefone} onChange={e => setForm(f=>({...f,telefone:e.target.value}))} placeholder="(41) 99999-0000" style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Nome do contato</label>
                <input value={form.contato} onChange={e => setForm(f=>({...f,contato:e.target.value}))} placeholder="Nome do responsável" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Endereço</label>
                <input value={form.endereco} onChange={e => setForm(f=>({...f,endereco:e.target.value}))} placeholder="Rua, número, cidade" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Observações</label>
                <textarea value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))} rows={2} placeholder="Informações adicionais..." style={{ ...inp, resize: 'vertical' }}/>
              </div>
              {saveErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{saveErr}</div>}
              <button type="submit" disabled={saving} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--p),var(--v))', color: '#fff', fontWeight: 800, fontSize: 15, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar fornecedor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
