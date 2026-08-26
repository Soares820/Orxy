'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  cargo: string;
  email: string;
  status: 'ativo' | 'inativo';
}

export default function EquipeScreen() {
  const { state } = useApp();
  const { data } = state;

  const team = useMemo<TeamMember[]>(() => {
    return (data.profiles ?? []).map((p) => ({
      id: p.id,
      name: p.nome ?? p.email ?? 'Sem nome',
      role: p.role ?? 'terapeuta',
      cargo: p.cargo ?? '',
      email: p.email ?? '',
      status: p.status ?? 'ativo',
    }));
  }, [data.profiles]);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNome, setInviteNome] = useState('');
  const [inviteRole, setInviteRole] = useState('terapeuta');
  const [inviteCargo, setInviteCargo] = useState('');
  const [invitePacienteId, setInvitePacienteId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    terapeuta: 'Terapeuta',
    familia: 'Familiar',
    recepcao: 'Recepção',
    financeiro: 'Financeiro',
  };

  const ROLE_COLORS: Record<string, string> = {
    admin: 'var(--p)',
    terapeuta: '#10b981',
    familia: 'var(--v)',
    recepcao: '#f59e0b',
    financeiro: '#3b82f6',
  };

  const initials = (name: string) => name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !inviteNome) return;
    if (inviteRole === 'familia' && !invitePacienteId) {
      setInviteError('Selecione o paciente vinculado a este familiar.');
      return;
    }
    setInviting(true);
    setInviteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clinic_id: state.user?.clinicId,
          email: inviteEmail,
          nome: inviteNome,
          role: inviteRole,
          cargo: inviteCargo.trim() || (ROLE_LABELS[inviteRole] ?? 'Terapeuta'),
          invited_by: state.user?.name,
          paciente_id: inviteRole === 'familia' ? invitePacienteId : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error ?? 'Erro ao enviar convite');
        return;
      }
      setInviteSent(true);
      setTimeout(() => {
        setShowInvite(false);
        setInviteSent(false);
        setInviteEmail('');
        setInviteNome('');
        setInviteCargo('');
        setInvitePacienteId('');
      }, 1800);
    } catch {
      setInviteError('Erro de conexão. Tente novamente.');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="view show" id="v-funcionarios">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Ferramentas</div>
          <h1 className="ph-title">Equipe</h1>
          <div className="ph-sub">{team.length} membro(s) na equipe</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button className="btn-p" onClick={() => setShowInvite(true)}>+ Convidar membro</button>
        </div>

        {team.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--bdr)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>Nenhum membro da equipe ainda</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Convide terapeutas e recepcionistas para a sua clínica</div>
            <button className="btn-p" onClick={() => setShowInvite(true)}>+ Convidar membro</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {team.map((m) => (
              <div key={m.id} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${ROLE_COLORS[m.role] ?? 'var(--p)'},var(--v))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {initials(m.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                  </div>
                </div>
                {m.cargo && (
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8, fontStyle: 'italic' }}>{m.cargo}</div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLORS[m.role] ?? 'var(--p)', background: 'var(--ps)', padding: '3px 10px', borderRadius: 20 }}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'ativo' ? '#10b981' : 'var(--t3)', background: m.status === 'ativo' ? 'rgba(16,185,129,.1)' : 'var(--sf2)', padding: '3px 10px', borderRadius: 20, marginLeft: 'auto' }}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, background: 'var(--ps)', border: '1px solid var(--p)', borderRadius: 'var(--r)', padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, color: 'var(--p)', marginBottom: 6, fontSize: 13 }}>💡 Como funciona o convite</div>
          <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.7 }}>
            Ao convidar um membro, ele receberá um e-mail com o link de acesso. Após o cadastro, ele terá acesso apenas às funcionalidades permitidas para seu perfil.
          </div>
        </div>
      </div>

      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowInvite(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', margin: 0 }}>Convidar membro</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {inviteSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: 16 }}>Convite enviado!</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>O membro receberá o e-mail em breve</div>
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {inviteError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, fontSize: 13, color: '#ef4444' }}>
                    {inviteError}
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Nome completo *</label>
                  <input value={inviteNome} onChange={(e) => setInviteNome(e.target.value)} placeholder="João da Silva" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>E-mail *</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="membro@clinica.com" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Perfil de acesso</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                    <option value="terapeuta">Terapeuta</option>
                    <option value="admin">Administrador</option>
                    <option value="recepcao">Recepção</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="familia">Familiar (Portal da Família)</option>
                  </select>
                </div>
                {inviteRole === 'familia' ? (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Paciente vinculado *</label>
                    <select value={invitePacienteId} onChange={(e) => setInvitePacienteId(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                      <option value="">Selecione o paciente...</option>
                      {data.children.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 5 }}>
                      Este familiar só terá acesso aos dados deste paciente no Portal da Família.
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>
                      Cargo <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(opcional)</span>
                    </label>
                    <input
                      value={inviteCargo}
                      onChange={(e) => setInviteCargo(e.target.value)}
                      placeholder="Ex: Terapeuta Ocupacional, Fonoaudióloga..."
                      list="cargo-suggestions"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <datalist id="cargo-suggestions">
                      <option value="Terapeuta Ocupacional" />
                      <option value="Fonoaudióloga" />
                      <option value="Fonoaudiólogo" />
                      <option value="Psicopedagoga" />
                      <option value="Psicopedagogo" />
                      <option value="Psicóloga" />
                      <option value="Psicólogo" />
                      <option value="Fisioterapeuta" />
                      <option value="Técnica em ABA" />
                      <option value="Técnico em ABA" />
                      <option value="Coordenadora Clínica" />
                      <option value="Coordenador Clínico" />
                      <option value="Analista do Comportamento" />
                      <option value="Recepcionista" />
                      <option value="Administrativo" />
                    </datalist>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setShowInvite(false)} style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                  <button type="submit" disabled={inviting} className="btn-p" style={{ flex: 2 }}>{inviting ? 'Enviando...' : 'Enviar convite'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
