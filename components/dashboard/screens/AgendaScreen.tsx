'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Sessao } from '@/lib/types';

const WDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SESSION_TYPES = ['ABA', 'TO', 'Fonoaudiologia', 'Psicologia', 'Avaliação', 'Outro'];
const STATUS_OPTS = [
  { val: 'agendado',  label: 'Agendado',  color: 'var(--p)',   dot: '#3B82F6' },
  { val: 'realizado', label: 'Realizado', color: '#10b981',   dot: '#10b981' },
  { val: 'cancelado', label: 'Cancelado', color: 'var(--d)',   dot: '#ef4444' },
  { val: 'falta',     label: 'Falta',     color: 'var(--w)',  dot: '#f59e0b' },
];

function statusDot(s: string) { return STATUS_OPTS.find(o => o.val === s)?.dot ?? '#94a3b8'; }
function statusLabel(s: string) { return STATUS_OPTS.find(o => o.val === s)?.label ?? s; }
function statusTagClass(s: string) {
  if (s === 'realizado') return 'ast-green';
  if (s === 'agendado') return 'ast-blue';
  if (s === 'cancelado' || s === 'falta') return 'ast-orange';
  return 'ast-gray';
}

export default function AgendaScreen() {
  const { state, dispatch } = useApp();
  const { data } = state;

  const todayStr = new Date().toISOString().slice(0, 10);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Sessao | null>(null);
  const [form, setForm] = useState({
    child_id: '', data: todayStr, hora: '09:00',
    duracao_min: '50', tipo: 'ABA', status: 'agendado', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  /* ── Calendar grid ── */
  const calDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const last  = new Date(calYear, calMonth + 1, 0);
    const startWd = first.getDay();  // 0=Sun
    const days: { date: string; otherMonth: boolean }[] = [];
    // pad from previous month
    for (let i = startWd - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth, -i);
      days.push({ date: d.toISOString().slice(0, 10), otherMonth: true });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(calYear, calMonth, d);
      days.push({ date: dt.toISOString().slice(0, 10), otherMonth: false });
    }
    // pad to complete last row
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      const d = new Date(last.date + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      days.push({ date: d.toISOString().slice(0, 10), otherMonth: true });
    }
    return days;
  }, [calYear, calMonth]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, Sessao[]> = {};
    for (const s of data.sessions) {
      if (!map[s.data]) map[s.data] = [];
      map[s.data].push(s);
    }
    return map;
  }, [data.sessions]);

  const daySessions = useMemo(() =>
    (sessionsByDate[selectedDate] ?? []).sort((a, b) => a.hora.localeCompare(b.hora)),
  [sessionsByDate, selectedDate]);

  const selectedDateFmt = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return `${WDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, [selectedDate]);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  function openNew(date?: string) {
    setEditing(null);
    setForm({ child_id: '', data: date ?? selectedDate, hora: '09:00', duracao_min: '50', tipo: 'ABA', status: 'agendado', notas: '' });
    setShowModal(true);
  }
  function openEdit(s: Sessao) {
    setEditing(s);
    setForm({ child_id: String(s.child_id), data: s.data, hora: s.hora, duracao_min: String(s.duracao_min ?? 50), tipo: s.tipo, status: s.status, notas: s.notas ?? '' });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.child_id || !state.user?.clinicId) {
      setSaveError('Selecione um paciente e aguarde o carregamento.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const childId = Number(form.child_id);
      const paciente = data.children.find(c => c.id === childId);
      const payload = {
        clinic_id: state.user.clinicId,
        child_id: childId,
        data: form.data,
        hora: form.hora,
        duracao_min: Number(form.duracao_min),
        tipo: form.tipo,
        status: form.status,
        notas: form.notas || null,
        paciente_nome: paciente?.name ?? null,
      };
      if (editing) {
        const { data: up, error } = await supabase.from('sessoes').update(payload).eq('id', editing.id).select().single();
        if (error) { setSaveError(error.message); return; }
        if (up) dispatch({ type: 'UPDATE_SESSION', payload: up });
      } else {
        const { data: cr, error } = await supabase.from('sessoes').insert(payload).select().single();
        if (error) { setSaveError(error.message); return; }
        if (cr) dispatch({ type: 'ADD_SESSION', payload: cr });
      }
      setShowModal(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm('Excluir esta sessão? Esta ação não pode ser desfeita.')) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('sessoes').delete().eq('id', editing.id);
    dispatch({ type: 'DELETE_SESSION', payload: editing.id });
    setShowModal(false);
  }

  const childName = (id: number) => data.children.find(c => c.id === id)?.name ?? '—';

  return (
    <div className="view show" id="v-agenda">
      <div className="page-body">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 18, height: 2, background: 'var(--p)', borderRadius: 2, display: 'inline-block' }} />
              Gestão
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--t1)', margin: 0, letterSpacing: '-.5px' }}>Agenda</h1>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>{MONTHS[calMonth]} {calYear}</div>
          </div>
          <button className="btn-p" onClick={() => openNew()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agendar sessão
          </button>
        </div>

        {/* Main layout */}
        <div className="agenda-layout">
          {/* LEFT: Monthly calendar */}
          <div className="agenda-cal-wrap">
            <div className="agenda-cal-nav">
              <button className="agenda-cal-arrow" onClick={prevMonth} aria-label="Mês anterior" title="Mês anterior">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="agenda-cal-month">{MONTHS[calMonth]} {calYear}</span>
              <button className="agenda-cal-arrow" onClick={nextMonth} aria-label="Próximo mês" title="Próximo mês">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {(calMonth !== new Date().getMonth() || calYear !== new Date().getFullYear()) && (
              <div style={{ textAlign: 'center', marginBottom: 10, marginTop: -4 }}>
                <button className="agenda-cal-today-btn" onClick={() => {
                  setCalYear(new Date().getFullYear());
                  setCalMonth(new Date().getMonth());
                  setSelectedDate(todayStr);
                }}>
                  Hoje
                </button>
              </div>
            )}

            <div className="agenda-cal-wd">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                <div key={d} className="agenda-cal-wdlbl">{d}</div>
              ))}
            </div>

            <div className="agenda-cal-grid">
              {calDays.map(({ date, otherMonth }) => {
                const isToday    = date === todayStr;
                const isSelected = date === selectedDate;
                const hasEvents  = (sessionsByDate[date]?.length ?? 0) > 0;
                let cls = 'agenda-day';
                if (otherMonth) cls += ' other-month';
                if (isToday) cls += ' today';
                if (isSelected) cls += ' selected';
                if (hasEvents) cls += ' has-events';
                return (
                  <div
                    key={date}
                    className={cls}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate(date)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDate(date); } }}
                  >
                    <span className="agenda-day-num">{new Date(date + 'T12:00:00').getDate()}</span>
                    <div className="agenda-day-dot" />
                  </div>
                );
              })}
            </div>

            {/* Weekly summary */}
            {(() => {
              const today = new Date();
              const day = today.getDay();
              const monday = new Date(today);
              monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
              const weekDates = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                return d.toISOString().slice(0, 10);
              });
              const total = weekDates.reduce((sum, d) => sum + (sessionsByDate[d]?.length ?? 0), 0);
              const done  = weekDates.reduce((sum, d) => sum + (sessionsByDate[d]?.filter(s => s.status === 'realizado').length ?? 0), 0);
              return (
                <div className="agenda-week-stats">
                  <div className="agenda-wstat">
                    <div className="agenda-wstat-val" style={{ color: 'var(--p)' }}>{total}</div>
                    <div className="agenda-wstat-lbl">Semana</div>
                  </div>
                  <div className="agenda-wstat">
                    <div className="agenda-wstat-val" style={{ color: '#10b981' }}>{done}</div>
                    <div className="agenda-wstat-lbl">Realizadas</div>
                  </div>
                  <div className="agenda-wstat">
                    <div className="agenda-wstat-val" style={{ color: 'var(--w)' }}>{total - done}</div>
                    <div className="agenda-wstat-lbl">Pendentes</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* RIGHT: Session list for selected day */}
          <div className="agenda-side">
            <div className="agenda-side-hd">
              <div>
                <div className="agenda-side-date">{selectedDateFmt}</div>
                <div className="agenda-side-sub">{daySessions.length} {daySessions.length === 1 ? 'sessão' : 'sessões'}</div>
              </div>
              <button className="btn-p" onClick={() => openNew(selectedDate)} style={{ fontSize: 12, padding: '7px 13px' }}>
                + Nova
              </button>
            </div>

            {daySessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12, filter: 'grayscale(.3)' }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>Sem sessões</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 18 }}>Nenhuma sessão para este dia</div>
                <button className="btn-s" onClick={() => openNew(selectedDate)} style={{ fontSize: 12, padding: '8px 16px' }}>+ Agendar sessão</button>
              </div>
            ) : (
              <div className="agenda-sess-list">
                {daySessions.map(s => (
                  <div
                    key={s.id}
                    className="agenda-sess"
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(s)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(s); } }}
                  >
                    <div className="agenda-sess-time">{s.hora}</div>
                    <div className="agenda-sess-dot" style={{ background: statusDot(s.status) }} />
                    <div className="agenda-sess-body">
                      <div className="agenda-sess-name">{s.paciente_nome || childName(s.child_id)}</div>
                      <div className="agenda-sess-meta">{s.tipo} · {s.duracao_min ?? 50}min</div>
                    </div>
                    <span className={`agenda-sess-tag ${statusTagClass(s.status)}`}>{statusLabel(s.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 450, boxShadow: 'var(--sh-xl)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--t1)', margin: 0 }}>{editing ? 'Editar sessão' : 'Nova sessão'}</h2>
              <button onClick={() => setShowModal(false)} aria-label="Fechar" style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Paciente *</label>
                <select value={form.child_id} onChange={e => setForm(f => ({ ...f, child_id: e.target.value }))} required
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                  <option value="">Selecione o paciente...</option>
                  {data.children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required
                    style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Horário *</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} required
                    style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                    {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Duração (min)</label>
                  <input type="number" value={form.duracao_min} onChange={e => setForm(f => ({ ...f, duracao_min: e.target.value }))} min="15" max="240" step="5"
                    style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Status</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUS_OPTS.map(o => (
                    <button key={o.val} type="button" onClick={() => setForm(f => ({ ...f, status: o.val }))}
                      style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${form.status === o.val ? o.dot : 'var(--bdr)'}`, background: form.status === o.val ? o.dot + '20' : 'none', color: form.status === o.val ? o.dot : 'var(--t3)', transition: '.15s' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Observações</label>
                <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Notas opcionais..."
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {editing && (
                  <button type="button" onClick={handleDelete}
                    style={{ padding: '12px 16px', borderRadius: 11, border: '1px solid var(--db)', background: 'none', color: 'var(--d)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Excluir
                  </button>
                )}
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 11, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-p" style={{ flex: 2 }}>
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
