'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/utils';
import type { Paciente } from '@/lib/types';

type FilterStatus = 'todos' | 'ativo' | 'inativo';

const emptyForm = { name: '', dob: '', diagnosis: '', responsible: '', pai_nome: '', mae_nome: '', email_responsavel: '', notes: '' };

function gerarCodigo(): string {
  return (100000 + Math.floor(Math.random() * 900000)).toString();
}

export default function PacientesScreen() {
  const { state, dispatch } = useApp();
  const { data } = state;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('todos');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Paciente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  const filtered = useMemo(() => {
    return data.children.filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.responsible ?? '').toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'todos' || c.status === filter;
      return matchSearch && matchFilter;
    });
  }, [data.children, search, filter]);

  function openNew() {
    setSelected(null);
    setForm(emptyForm);
    setSaveError('');
    setInviteMsg('');
    setShowModal(true);
  }

  function openEdit(p: Paciente) {
    setSelected(p);
    setForm({
      name: p.name,
      dob: p.dob ?? '',
      diagnosis: p.diagnosis ?? '',
      responsible: p.responsible ?? '',
      pai_nome: p.pai_nome ?? '',
      mae_nome: p.mae_nome ?? '',
      email_responsavel: p.email_responsavel ?? '',
      notes: p.notes ?? '',
    });
    setSaveError('');
    setInviteMsg('');
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;

      const { data: userRow } = await supabase.from('users').select('clinic_id').eq('auth_id', uid).single();
      const clinic_id = userRow?.clinic_id;

      const payload = {
        name: form.name,
        dob: form.dob || null,
        diagnosis: form.diagnosis || null,
        responsible: form.responsible || null,
        pai_nome: form.pai_nome || null,
        mae_nome: form.mae_nome || null,
        email_responsavel: form.email_responsavel || null,
        notes: form.notes || null,
      };

      if (selected) {
        const { data: updated, error } = await supabase.from('pacientes')
          .update(payload)
          .eq('id', selected.id)
          .select()
          .single();
        if (error) { setSaveError(error.message); return; }
        if (updated) dispatch({ type: 'UPDATE_CHILD', payload: updated });
      } else {
        const { data: created, error } = await supabase.from('pacientes')
          .insert({ ...payload, status: 'ativo', clinic_id, codigo: gerarCodigo() })
          .select()
          .single();
        if (error) { setSaveError(error.message); return; }
        if (created) dispatch({ type: 'ADD_CHILD', payload: created });
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendInvite() {
    if (!form.email_responsavel || !state.user?.clinicId) return;
    setInviting(true);
    setInviteMsg('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const nomeFamilia = form.responsible || form.mae_nome || form.pai_nome || form.name;
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          clinic_id: state.user.clinicId,
          email: form.email_responsavel,
          nome: nomeFamilia,
          cargo: 'Família',
          role: 'familia',
          invited_by: state.user.name,
        }),
      });
      const result = await res.json();
      setInviteMsg(result.ok
        ? `Convite enviado para ${form.email_responsavel}!`
        : `Erro: ${result.error ?? 'Tente novamente'}`);
    } finally {
      setInviting(false);
    }
  }

  const calcAge = (dob: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) y--;
    return y;
  };

  const initials = (name: string) => name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="view show" id="v-criancas">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Gestão</div>
          <h1 className="ph-title">Pacientes</h1>
          <div className="ph-sub">{data.children.length} paciente(s) cadastrado(s)</div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar paciente ou responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['todos', 'ativo', 'inativo'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid', borderColor: filter === f ? 'var(--p)' : 'var(--bdr)', background: filter === f ? 'var(--ps)' : 'none', color: filter === f ? 'var(--p)' : 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="btn-p" onClick={openNew}>+ Novo paciente</button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>👶</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>Nenhum paciente encontrado</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Adicione o primeiro paciente para começar</div>
            <button className="btn-p" onClick={openNew}>+ Novo paciente</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => openEdit(p)}
                style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: 18, cursor: 'pointer', transition: '.15s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,var(--p),var(--v))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    {p.dob && <div style={{ fontSize: 12, color: 'var(--t3)' }}>{calcAge(p.dob)} anos</div>}
                    {p.codigo && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
                        Código: <strong style={{ color: 'var(--p)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>{p.codigo}</strong>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: p.status === 'ativo' ? 'rgba(16,185,129,.12)' : 'var(--sf2)', color: p.status === 'ativo' ? '#10b981' : 'var(--t3)' }}>
                    {p.status}
                  </span>
                </div>
                {p.diagnosis && <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}><strong>Diagnóstico:</strong> {p.diagnosis}</div>}
                {(p.pai_nome || p.mae_nome) && (
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>
                    {p.pai_nome && <span>Pai: {p.pai_nome}</span>}
                    {p.pai_nome && p.mae_nome && <span> · </span>}
                    {p.mae_nome && <span>Mãe: {p.mae_nome}</span>}
                  </div>
                )}
                {p.responsible && <div style={{ fontSize: 12, color: 'var(--t3)' }}>Resp: {p.responsible}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', margin: 0 }}>{selected ? 'Editar paciente' : 'Novo paciente'}</h2>
                {selected?.codigo && (
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>
                    Código do paciente:{' '}
                    <strong style={{ color: 'var(--p)', letterSpacing: '0.15em', fontFamily: 'monospace', fontSize: 14 }}>{selected.codigo}</strong>
                  </div>
                )}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Dados do paciente */}
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Dados do paciente</div>
              {[
                { label: 'Nome completo *', field: 'name', type: 'text', placeholder: 'Ex: Maria Eduarda Silva' },
                { label: 'Data de nascimento', field: 'dob', type: 'date', placeholder: '' },
                { label: 'Diagnóstico', field: 'diagnosis', type: 'text', placeholder: 'Ex: TEA nível 1' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    required={field === 'name'}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              {/* Dados familiares */}
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>Dados dos pais / responsavel</div>
              {[
                { label: 'Nome do pai', field: 'pai_nome', placeholder: 'Nome completo do pai' },
                { label: 'Nome da mae', field: 'mae_nome', placeholder: 'Nome completo da mae' },
                { label: 'Responsavel (legal)', field: 'responsible', placeholder: 'Responsavel legal pelo paciente' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              {/* Email para portal + botão de convite */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>E-mail para portal dos pais</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={form.email_responsavel}
                    onChange={(e) => { setForm((f) => ({ ...f, email_responsavel: e.target.value })); setInviteMsg(''); }}
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  {form.email_responsavel && (
                    <button
                      type="button"
                      onClick={handleSendInvite}
                      disabled={inviting}
                      style={{ padding: '10px 14px', border: '1px solid var(--p)', borderRadius: 10, background: 'var(--ps)', color: 'var(--p)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {inviting ? 'Enviando...' : 'Enviar acesso'}
                    </button>
                  )}
                </div>
                {inviteMsg && (
                  <div style={{ marginTop: 6, fontSize: 12, padding: '6px 10px', borderRadius: 8, background: inviteMsg.startsWith('Erro') ? 'rgba(239,68,68,.1)' : 'rgba(16,185,129,.1)', color: inviteMsg.startsWith('Erro') ? '#f87171' : '#10b981', fontWeight: 600 }}>
                    {inviteMsg}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Clique em &quot;Enviar acesso&quot; para mandar o convite de acesso ao portal da família</div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Observacoes</label>
                <textarea
                  placeholder="Informacoes adicionais..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {saveError && (
                <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f87171' }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={saving} className="btn-p" style={{ flex: 2 }}>{saving ? 'Salvando...' : selected ? 'Salvar alteracoes' : 'Cadastrar paciente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
