'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/xlsx-utils';
import { todayLocalISO } from '@/lib/utils';
import type { EstoqueItem, EstoqueMovimentacao } from '@/lib/types';

const CATEGORIAS: { key: EstoqueItem['categoria']; label: string; emoji: string }[] = [
  { key: 'terapeutico', label: 'Material Terapêutico', emoji: '🧩' },
  { key: 'escritorio',  label: 'Escritório',            emoji: '📎' },
  { key: 'higiene_epi', label: 'Higiene/EPI',           emoji: '🧤' },
  { key: 'alimentacao', label: 'Alimentação',           emoji: '🍎' },
  { key: 'limpeza',     label: 'Limpeza',               emoji: '🧴' },
  { key: 'outros',      label: 'Outros',                emoji: '📦' },
];

const MOV_TIPOS: { key: EstoqueMovimentacao['tipo']; label: string; sign: string; color: string }[] = [
  { key: 'entrada', label: 'Entrada', sign: '+', color: '#10b981' },
  { key: 'saida',   label: 'Saída',   sign: '−', color: '#ef4444' },
  { key: 'ajuste',  label: 'Ajuste (definir valor exato)', sign: '=', color: '#f59e0b' },
];

const emptyForm = {
  nome: '', categoria: 'outros' as EstoqueItem['categoria'], unidade: 'un',
  quantidade_inicial: '0', estoque_minimo: '0', fornecedor_id: '', validade: '', notas: '',
};

const s = (base: React.CSSProperties) => base;

function daysUntil(dateStr: string): number {
  const today = new Date(todayLocalISO() + 'T00:00:00');
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default function EstoqueScreen() {
  const { state, dispatch } = useApp();
  const clinicId = state.user?.clinicId ?? '';
  const estoque = useMemo(() => state.data.estoque ?? [], [state.data.estoque]);
  const fornecedores = useMemo(() => state.data.fornecedores ?? [], [state.data.fornecedores]);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('todos');
  const [lowOnly, setLowOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EstoqueItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const [movItem, setMovItem] = useState<EstoqueItem | null>(null);
  const [movForm, setMovForm] = useState({ tipo: 'entrada' as EstoqueMovimentacao['tipo'], quantidade: '', motivo: '' });
  const [movSaving, setMovSaving] = useState(false);
  const [movErr, setMovErr] = useState('');

  const [historyItem, setHistoryItem] = useState<EstoqueItem | null>(null);
  const [historyRows, setHistoryRows] = useState<EstoqueMovimentacao[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isBaixo = (it: EstoqueItem) => it.quantidade <= it.estoque_minimo;
  const validadeInfo = (it: EstoqueItem) => {
    if (!it.validade) return null;
    const dias = daysUntil(it.validade);
    if (dias < 0) return { label: 'Vencido', color: '#ef4444' };
    if (dias <= 30) return { label: `Vence em ${dias}d`, color: '#f59e0b' };
    return null;
  };

  const filtered = useMemo(() => {
    let list = estoque.filter(it => it.status === 'ativo');
    if (catFilter !== 'todos') list = list.filter(it => it.categoria === catFilter);
    if (lowOnly) list = list.filter(isBaixo);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => it.nome.toLowerCase().includes(q));
    }
    return list;
  }, [estoque, search, catFilter, lowOnly]);

  const fornecedorNome = (id?: number | null) => fornecedores.find(f => f.id === id)?.nome ?? null;
  const catInfo = (key: string) => CATEGORIAS.find(c => c.key === key) ?? CATEGORIAS[CATEGORIAS.length - 1];

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setSaveErr('');
    setShowModal(true);
  }

  function openEdit(it: EstoqueItem) {
    setEditing(it);
    setForm({
      nome: it.nome, categoria: it.categoria, unidade: it.unidade,
      quantidade_inicial: String(it.quantidade), estoque_minimo: String(it.estoque_minimo),
      fornecedor_id: it.fornecedor_id ? String(it.fornecedor_id) : '',
      validade: it.validade ?? '', notas: it.notas ?? '',
    });
    setSaveErr('');
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true); setSaveErr('');
    try {
      const basePayload = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade.trim() || 'un',
        estoque_minimo: Number(form.estoque_minimo) || 0,
        fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null,
        validade: form.validade || null,
        notas: form.notas.trim() || null,
      };

      if (editing) {
        const { data, error } = await supabase.from('estoque')
          .update(basePayload).eq('id', editing.id).select().single();
        if (error) throw error;
        dispatch({ type: 'SET_DATA', payload: { estoque: estoque.map(it => it.id === editing.id ? data as EstoqueItem : it) } });
      } else {
        const { data: created, error } = await supabase.from('estoque')
          .insert({ ...basePayload, clinic_id: clinicId, quantidade: 0, status: 'ativo' })
          .select().single();
        if (error) throw error;
        let finalItem = created as EstoqueItem;

        const qtdInicial = Number(form.quantidade_inicial) || 0;
        if (qtdInicial > 0) {
          const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
            clinic_id: clinicId, estoque_id: finalItem.id, tipo: 'entrada',
            quantidade: qtdInicial, motivo: 'Cadastro inicial', usuario_nome: state.user?.name ?? null,
          });
          if (movError) throw movError;
          finalItem = { ...finalItem, quantidade: qtdInicial };
        }
        dispatch({ type: 'SET_DATA', payload: { estoque: [...estoque, finalItem] } });
      }
      setShowModal(false);
    } catch (err: unknown) {
      setSaveErr(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function handleDelete(it: EstoqueItem) {
    if (!confirm(`Remover "${it.nome}" do estoque?`)) return;
    await supabase.from('estoque').update({ status: 'inativo' }).eq('id', it.id);
    dispatch({ type: 'SET_DATA', payload: { estoque: estoque.filter(x => x.id !== it.id) } });
  }

  function openMov(it: EstoqueItem) {
    setMovItem(it);
    setMovForm({ tipo: 'entrada', quantidade: '', motivo: '' });
    setMovErr('');
  }

  async function handleMovSave(e: React.FormEvent) {
    e.preventDefault();
    if (!movItem) return;
    const qtd = Number(movForm.quantidade);
    if (!qtd || qtd <= 0) { setMovErr('Informe uma quantidade maior que zero.'); return; }
    setMovSaving(true); setMovErr('');
    try {
      const { error } = await supabase.from('estoque_movimentacoes').insert({
        clinic_id: clinicId, estoque_id: movItem.id, tipo: movForm.tipo,
        quantidade: qtd, motivo: movForm.motivo.trim() || null, usuario_nome: state.user?.name ?? null,
      });
      if (error) throw error;

      let novaQtd = movItem.quantidade;
      if (movForm.tipo === 'entrada') novaQtd += qtd;
      else if (movForm.tipo === 'saida') novaQtd = Math.max(novaQtd - qtd, 0);
      else novaQtd = qtd;

      dispatch({ type: 'SET_DATA', payload: { estoque: estoque.map(it => it.id === movItem.id ? { ...it, quantidade: novaQtd } : it) } });
      setMovItem(null);
    } catch (err: unknown) {
      setMovErr(err instanceof Error ? err.message : 'Erro ao registrar movimentação');
    } finally { setMovSaving(false); }
  }

  async function openHistory(it: EstoqueItem) {
    setHistoryItem(it);
    setHistoryLoading(true);
    setHistoryRows([]);
    const { data } = await supabase.from('estoque_movimentacoes')
      .select('*').eq('estoque_id', it.id).order('created_at', { ascending: false }).limit(100);
    setHistoryRows((data as EstoqueMovimentacao[]) ?? []);
    setHistoryLoading(false);
  }

  function handleExport() {
    const rows = filtered.map(it => ({
      Nome: it.nome,
      Categoria: catInfo(it.categoria).label,
      Quantidade: it.quantidade,
      Unidade: it.unidade,
      'Estoque mínimo': it.estoque_minimo,
      'Estoque baixo': isBaixo(it) ? 'Sim' : 'Não',
      Fornecedor: fornecedorNome(it.fornecedor_id) ?? '',
      Validade: it.validade ?? '',
      Notas: it.notas ?? '',
    }));
    exportToExcel(rows, `estoque_${todayLocalISO()}`, 'Estoque');
  }

  const inp = s({ width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: '1.5px solid var(--bdr)', borderRadius: 10, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', outline: 'none' });
  const lbl = s({ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '.07em' });

  const totalAtivos = estoque.filter(it => it.status === 'ativo').length;
  const totalBaixo = estoque.filter(it => it.status === 'ativo' && isBaixo(it)).length;
  const totalVencendoOuVencido = estoque.filter(it => it.status === 'ativo' && validadeInfo(it) !== null).length;

  return (
    <div className="view show" id="v-estoque">
      <div className="page-body">

      {/* Header */}
      <div className="page-hero">
        <div className="ph-pre"><span></span>Ferramentas</div>
        <h1 className="ph-title">Estoque</h1>
        <div className="ph-sub">Materiais da clínica, controle de quantidade e histórico de movimentações</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <button onClick={handleExport} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--sf)', color: 'var(--t2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar Excel
        </button>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--p),var(--v))', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo material
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material..." style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
          <option value="todos">Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
        </select>
        <button
          onClick={() => setLowOnly(v => !v)}
          style={{ padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${lowOnly ? '#ef4444' : 'var(--bdr)'}`, background: lowOnly ? 'rgba(239,68,68,.1)' : 'var(--sf2)', color: lowOnly ? '#ef4444' : 'var(--t2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          ⚠️ Só estoque baixo
        </button>
      </div>

      {/* Stats rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#3b82f6' }}>{totalAtivos}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 2 }}>Materiais</div>
        </div>
        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: totalBaixo > 0 ? '#ef4444' : '#10b981' }}>{totalBaixo}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 2 }}>Estoque baixo</div>
        </div>
        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: totalVencendoOuVencido > 0 ? '#f59e0b' : '#10b981' }}>{totalVencendoOuVencido}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 2 }}>Venc. em 30d/vencido</div>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t2)', marginBottom: 6 }}>Nenhum material cadastrado</div>
          <div style={{ fontSize: 13 }}>Cadastre materiais terapêuticos, EPI, escritório etc. para controlar o inventário</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {filtered.map(it => {
            const cat = catInfo(it.categoria);
            const baixo = isBaixo(it);
            const venc = validadeInfo(it);
            return (
              <div key={it.id} style={{ background: 'var(--sf)', border: `1px solid ${baixo ? 'rgba(239,68,68,.35)' : 'var(--bdr)'}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--sf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cat.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{it.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--p)', fontWeight: 600, marginTop: 2 }}>{cat.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(it)} title="Editar material" aria-label="Editar material" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--sf2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(it)} title="Remover material" aria-label="Remover material" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: baixo ? '#ef4444' : 'var(--t1)' }}>{it.quantidade}</div>
                  <div style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 600 }}>{it.unidade}</div>
                  {baixo && <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,.12)', padding: '3px 8px', borderRadius: 20 }}>ESTOQUE BAIXO</span>}
                  {venc && <span style={{ fontSize: 10, fontWeight: 800, color: venc.color, background: venc.color + '20', padding: '3px 8px', borderRadius: 20 }}>{venc.label.toUpperCase()}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Mínimo: {it.estoque_minimo} {it.unidade}{fornecedorNome(it.fornecedor_id) ? ` · Fornecedor: ${fornecedorNome(it.fornecedor_id)}` : ''}</div>
                {it.notas && <div style={{ fontSize: 12, color: 'var(--t3)', background: 'var(--sf2)', borderRadius: 8, padding: '8px 10px' }}>{it.notas}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => openMov(it)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--p),var(--v))', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Movimentar
                  </button>
                  <button onClick={() => openHistory(it)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--sf2)', color: 'var(--t2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Histórico
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: novo/editar material */}
      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--sf)', borderRadius: 20, width: '100%', maxWidth: 560, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }}>
            <div style={{ background: 'linear-gradient(135deg,var(--p),var(--v))', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{editing ? 'Editar material' : 'Novo material'}</div>
              <button onClick={() => setShowModal(false)} title="Fechar" aria-label="Fechar" style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nome *</label>
                <input required value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Luva de látex, Fralda geriátrica..." style={inp}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value as EstoqueItem['categoria']}))} style={{ ...inp, cursor: 'pointer' }}>
                    {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Unidade</label>
                  <input value={form.unidade} onChange={e => setForm(f=>({...f,unidade:e.target.value}))} placeholder="un, cx, kg..." style={inp}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>{editing ? 'Quantidade atual' : 'Quantidade inicial'}</label>
                  <input type="number" min="0" step="1" value={form.quantidade_inicial} onChange={e => setForm(f=>({...f,quantidade_inicial:e.target.value}))} disabled={!!editing}
                    style={{ ...inp, opacity: editing ? .6 : 1, cursor: editing ? 'not-allowed' : 'text' }}/>
                  {editing && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Use &quot;Movimentar&quot; para ajustar a quantidade</div>}
                </div>
                <div>
                  <label style={lbl}>Estoque mínimo</label>
                  <input type="number" min="0" step="1" value={form.estoque_minimo} onChange={e => setForm(f=>({...f,estoque_minimo:e.target.value}))} style={inp}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Fornecedor</label>
                  <select value={form.fornecedor_id} onChange={e => setForm(f=>({...f,fornecedor_id:e.target.value}))} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="">Não informado</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Validade</label>
                  <input type="date" value={form.validade} onChange={e => setForm(f=>({...f,validade:e.target.value}))} style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Observações</label>
                <textarea value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))} rows={2} placeholder="Informações adicionais..." style={{ ...inp, resize: 'vertical' }}/>
              </div>
              {saveErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{saveErr}</div>}
              <button type="submit" disabled={saving} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--p),var(--v))', color: '#fff', fontWeight: 800, fontSize: 15, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar material'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: movimentação */}
      {movItem && (
        <div onClick={e => e.target === e.currentTarget && setMovItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--sf)', borderRadius: 20, width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>Movimentar estoque</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{movItem.nome} · atual: {movItem.quantidade} {movItem.unidade}</div>
              </div>
              <button onClick={() => setMovItem(null)} aria-label="Fechar" style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleMovSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Tipo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MOV_TIPOS.map(t => (
                    <button key={t.key} type="button" onClick={() => setMovForm(f => ({ ...f, tipo: t.key }))}
                      style={{ flex: 1, padding: '9px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${movForm.tipo === t.key ? t.color : 'var(--bdr)'}`, background: movForm.tipo === t.key ? t.color + '20' : 'none', color: movForm.tipo === t.key ? t.color : 'var(--t3)' }}>
                      {t.sign} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>{movForm.tipo === 'ajuste' ? 'Novo valor exato' : 'Quantidade'}</label>
                <input type="number" min="0" step="1" required value={movForm.quantidade} onChange={e => setMovForm(f => ({ ...f, quantidade: e.target.value }))} style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>Motivo (opcional)</label>
                <input value={movForm.motivo} onChange={e => setMovForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Ex: uso em sessão, compra, perda..." style={inp} />
              </div>
              {movErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{movErr}</div>}
              <button type="submit" disabled={movSaving} style={{ padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--p),var(--v))', color: '#fff', fontWeight: 800, fontSize: 14, cursor: movSaving ? 'wait' : 'pointer' }}>
                {movSaving ? 'Salvando...' : 'Confirmar movimentação'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: histórico */}
      {historyItem && (
        <div onClick={e => e.target === e.currentTarget && setHistoryItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--sf)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 14px', borderBottom: '1px solid var(--bdr)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>Histórico de movimentação</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{historyItem.nome}</div>
              </div>
              <button onClick={() => setHistoryItem(null)} aria-label="Fechar" style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: '14px 24px', overflowY: 'auto', flex: 1 }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '30px 0', fontSize: 13 }}>Carregando...</div>
              ) : historyRows.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '30px 0', fontSize: 13 }}>Nenhuma movimentação registrada ainda.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {historyRows.map(m => {
                    const t = MOV_TIPOS.find(x => x.key === m.tipo)!;
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--sf2)', borderRadius: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: t.color + '20', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{t.sign}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{t.label} · {m.quantidade} {historyItem.unidade}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                            {m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : ''}
                            {m.usuario_nome ? ` · ${m.usuario_nome}` : ''}
                            {m.motivo ? ` · ${m.motivo}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
