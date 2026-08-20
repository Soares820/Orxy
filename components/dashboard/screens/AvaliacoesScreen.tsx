'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/utils';
import { parseFile, mapAvaliacao } from '@/lib/xlsx-utils';
import type { Avaliacao } from '@/lib/types';

type TipoAvaliacao = Avaliacao['tipo'];

const TIPOS: TipoAvaliacao[] = ['PEDI', 'PS', 'SPM', 'ABLLS', 'VBMAPP', 'CARS', 'Vineland', 'Personalizado', 'Outro'];

const TIPO_DESC: Record<TipoAvaliacao, string> = {
  PEDI: 'Inventário de Avaliação Pediátrica de Incapacidade',
  PS: 'Perfil Sensorial 2 (Dunn)',
  SPM: 'Medida de Processamento Sensorial',
  ABLLS: 'Assessment of Basic Language and Learning Skills',
  VBMAPP: 'Verbal Behavior Milestones Assessment and Placement Program',
  CARS: 'Childhood Autism Rating Scale — 15 itens (1–4)',
  Vineland: 'Escala de Comportamento Adaptativo Vineland II',
  Personalizado: 'Instrumento personalizado ou criado pela terapeuta',
  Outro: 'Outro instrumento clínico',
};

interface ScoreDef {
  key: string;
  label: string;
  min: number;
  max: number;
  unit?: string;
  step?: number;
}

const SCORE_DEFS: Partial<Record<TipoAvaliacao, ScoreDef[]>> = {
  PEDI: [
    { key: 'autocuidado', label: 'Autocuidado', min: 0, max: 100, unit: 'pts' },
    { key: 'mobilidade', label: 'Mobilidade', min: 0, max: 100, unit: 'pts' },
    { key: 'funcao_social', label: 'Função Social', min: 0, max: 100, unit: 'pts' },
    { key: 'total', label: 'Escore Total', min: 0, max: 100, unit: 'pts' },
  ],
  PS: [
    { key: 'registro', label: 'Registro Baixo', min: 1, max: 125 },
    { key: 'busca', label: 'Busca de Sensação', min: 1, max: 85 },
    { key: 'sensibilidade', label: 'Sensibilidade Sensorial', min: 1, max: 100 },
    { key: 'evitacao', label: 'Evitação Sensorial', min: 1, max: 130 },
    { key: 'total', label: 'Escore Total', min: 4, max: 440 },
  ],
  SPM: [
    { key: 'social', label: 'Participação Social', min: 5, max: 35 },
    { key: 'visao', label: 'Visão', min: 5, max: 35 },
    { key: 'audicao', label: 'Audição', min: 5, max: 30 },
    { key: 'tato', label: 'Tato', min: 5, max: 35 },
    { key: 'corpo', label: 'Consciência Corporal', min: 5, max: 35 },
    { key: 'equilibrio', label: 'Equilíbrio e Movimento', min: 5, max: 30 },
    { key: 'planejamento', label: 'Planejamento e Ideias', min: 5, max: 35 },
  ],
  ABLLS: [
    { key: 'ling_receptiva', label: 'Linguagem Receptiva', min: 0, max: 25 },
    { key: 'ling_expressiva', label: 'Linguagem Expressiva', min: 0, max: 40 },
    { key: 'interacao', label: 'Interação Social', min: 0, max: 24 },
    { key: 'imitacao', label: 'Imitação', min: 0, max: 30 },
    { key: 'visuais', label: 'Habilidades Visuais', min: 0, max: 25 },
    { key: 'autocuidado', label: 'Autocuidado', min: 0, max: 25 },
  ],
  VBMAPP: [
    { key: 'mando', label: 'Mando', min: 0, max: 50 },
    { key: 'tato', label: 'Tato', min: 0, max: 50 },
    { key: 'ouvinte', label: 'Ouvinte (Listener)', min: 0, max: 50 },
    { key: 'visuais', label: 'Habilidades Visuais', min: 0, max: 50 },
    { key: 'imitacao', label: 'Imitação', min: 0, max: 30 },
    { key: 'ecoico', label: 'Ecóico', min: 0, max: 50 },
    { key: 'motor', label: 'Motor Verbal', min: 0, max: 30 },
  ],
  CARS: [
    { key: 'relacao_pessoas', label: 'Relação com Pessoas', min: 1, max: 4, step: 0.5 },
    { key: 'imitacao', label: 'Imitação', min: 1, max: 4, step: 0.5 },
    { key: 'resposta_emocional', label: 'Resposta Emocional', min: 1, max: 4, step: 0.5 },
    { key: 'uso_corpo', label: 'Uso do Corpo', min: 1, max: 4, step: 0.5 },
    { key: 'uso_objetos', label: 'Uso de Objetos', min: 1, max: 4, step: 0.5 },
    { key: 'adaptacao_mudancas', label: 'Adaptação a Mudanças', min: 1, max: 4, step: 0.5 },
    { key: 'resposta_visual', label: 'Resposta Visual', min: 1, max: 4, step: 0.5 },
    { key: 'resposta_auditiva', label: 'Resposta Auditiva', min: 1, max: 4, step: 0.5 },
    { key: 'olfato_paladar_tato', label: 'Uso de Olfato / Paladar / Tato', min: 1, max: 4, step: 0.5 },
    { key: 'medo_ansiedade', label: 'Medo e Ansiedade', min: 1, max: 4, step: 0.5 },
    { key: 'comunicacao_verbal', label: 'Comunicação Verbal', min: 1, max: 4, step: 0.5 },
    { key: 'comunicacao_nverbal', label: 'Comunicação Não-Verbal', min: 1, max: 4, step: 0.5 },
    { key: 'nivel_atividade', label: 'Nível de Atividade', min: 1, max: 4, step: 0.5 },
    { key: 'consist_intelectual', label: 'Nível/Consistência Intelectual', min: 1, max: 4, step: 0.5 },
    { key: 'impressao_geral', label: 'Impressão Geral do Avaliador', min: 1, max: 4, step: 0.5 },
  ],
  Vineland: [
    { key: 'comunicacao', label: 'Comunicação', min: 20, max: 160, unit: 'SS' },
    { key: 'vida_diaria', label: 'Habilidades de Vida Diária', min: 20, max: 160, unit: 'SS' },
    { key: 'socializacao', label: 'Socialização', min: 20, max: 160, unit: 'SS' },
    { key: 'motor', label: 'Habilidades Motoras', min: 20, max: 130, unit: 'SS' },
  ],
};

function carsResult(scores: Record<string, string>): { total: number; nivel: string; color: string } | null {
  const defs = SCORE_DEFS.CARS!;
  const vals = defs.map((d) => parseFloat(scores[d.key] || '0'));
  if (vals.some((v) => isNaN(v) || v === 0)) return null;
  const total = Math.round(vals.reduce((a, b) => a + b, 0) * 10) / 10;
  let nivel = '';
  let color = '';
  if (total < 30) { nivel = 'Sem indicativos de TEA'; color = '#10b981'; }
  else if (total <= 36) { nivel = 'TEA leve a moderado'; color = '#f59e0b'; }
  else { nivel = 'TEA severo'; color = '#ef4444'; }
  return { total, nivel, color };
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid var(--bdr)',
  borderRadius: 8,
  background: 'var(--sf)',
  color: 'var(--t1)',
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--t2)',
  display: 'block',
  marginBottom: 5,
};

interface ScoreFormProps {
  tipo: TipoAvaliacao;
  scores: Record<string, string>;
  onChange: (key: string, val: string) => void;
}

function ScoreForm({ tipo, scores, onChange }: ScoreFormProps) {
  const defs = SCORE_DEFS[tipo];
  if (!defs) return null;

  if (tipo === 'CARS') {
    const result = carsResult(scores);
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
          15 Itens — escala 1 a 4 (1=normal, 4=severamente atípico; valores 1.5, 2.5, 3.5 permitidos)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
          {defs.map((d, i) => (
            <div key={d.key}>
              <label style={{ ...labelStyle, fontSize: 11 }}>{i + 1}. {d.label}</label>
              <input
                type="number"
                min={d.min}
                max={d.max}
                step={d.step ?? 0.5}
                value={scores[d.key] ?? ''}
                onChange={(e) => onChange(d.key, e.target.value)}
                placeholder="1–4"
                style={{ ...inputStyle, fontSize: 13, padding: '7px 10px' }}
              />
            </div>
          ))}
        </div>
        {result && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--sf2)', border: `1px solid ${result.color}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: result.color, lineHeight: 1 }}>{result.total}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: result.color }}>{result.nivel}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Pontuação total CARS (15–60)</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: defs.length > 4 ? '1fr 1fr' : '1fr 1fr', gap: '10px 12px' }}>
      {defs.map((d) => (
        <div key={d.key}>
          <label style={labelStyle}>
            {d.label}
            {d.unit && <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: 4 }}>({d.unit})</span>}
            <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: 4 }}>{d.min}–{d.max}</span>
          </label>
          <input
            type="number"
            min={d.min}
            max={d.max}
            step={d.step ?? 1}
            value={scores[d.key] ?? ''}
            onChange={(e) => onChange(d.key, e.target.value)}
            placeholder={String(d.min)}
            style={inputStyle}
          />
        </div>
      ))}
    </div>
  );
}

export default function AvaliacoesScreen() {
  const { state, dispatch } = useApp();
  const { data } = state;

  const [selectedChildId, setSelectedChildId] = useState<number | null>(data.children[0]?.id ?? null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAval, setSelectedAval] = useState<Avaliacao | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const xlsxFileRef = useRef<HTMLInputElement>(null);
  const [xlsxImportRows, setXlsxImportRows] = useState<ReturnType<typeof mapAvaliacao>[]>([]);
  const [xlsxImportState, setXlsxImportState] = useState<'idle' | 'preview' | 'importing'>('idle');

  // Inicializa o paciente selecionado quando os dados carregam
  useEffect(() => {
    if (!selectedChildId && data.children.length > 0) {
      setSelectedChildId(data.children[0].id);
    }
  }, [data.children, selectedChildId]);
  const [form, setForm] = useState({
    tipo: 'PEDI' as TipoAvaliacao,
    data: new Date().toISOString().slice(0, 10),
    notas: '',
    instrumento_nome: '',
    scores: {} as Record<string, string>,
  });

  const childEvals = useMemo(() =>
    selectedChildId ? data.evaluations.filter((e) => e.child_id === selectedChildId) : [],
    [data.evaluations, selectedChildId]
  );

  const selectedChild = useMemo(() =>
    data.children.find((c) => c.id === selectedChildId) ?? null,
    [data.children, selectedChildId]
  );

  function buildEmptyScores(tipo: TipoAvaliacao): Record<string, string> {
    const defs = SCORE_DEFS[tipo];
    if (!defs) return {};
    return Object.fromEntries(defs.map((d) => [d.key, '']));
  }

  function scoresFromSaved(tipo: TipoAvaliacao, saved: Record<string, unknown>): Record<string, string> {
    const defs = SCORE_DEFS[tipo];
    if (!defs) return {};
    return Object.fromEntries(defs.map((d) => [d.key, saved[d.key] != null ? String(saved[d.key]) : '']));
  }

  function openNew() {
    setSelectedAval(null);
    setForm({
      tipo: 'PEDI',
      data: new Date().toISOString().slice(0, 10),
      notas: '',
      instrumento_nome: '',
      scores: buildEmptyScores('PEDI'),
    });
    setShowModal(true);
  }

  function openEdit(a: Avaliacao) {
    setSelectedAval(a);
    setForm({
      tipo: a.tipo,
      data: a.data,
      notas: a.notas ?? '',
      instrumento_nome: (a.scores?.instrumento_nome as string) ?? '',
      scores: scoresFromSaved(a.tipo, a.scores ?? {}),
    });
    setShowModal(true);
  }

  function handleTipoChange(tipo: TipoAvaliacao) {
    setForm((f) => ({ ...f, tipo, scores: buildEmptyScores(tipo) }));
  }

  function handleScoreChange(key: string, val: string) {
    setForm((f) => ({ ...f, scores: { ...f.scores, [key]: val } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChildId || !state.user?.clinicId) {
      setSaveError('Selecione um paciente e aguarde o carregamento da clínica.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const { supabase } = await import('@/lib/supabase');

      const defs = SCORE_DEFS[form.tipo];
      const numericScores: Record<string, unknown> = {};
      if (defs) {
        for (const d of defs) {
          const v = parseFloat(form.scores[d.key] || '');
          if (!isNaN(v)) numericScores[d.key] = v;
        }
      }
      if (form.tipo === 'Personalizado' && form.instrumento_nome) {
        numericScores.instrumento_nome = form.instrumento_nome;
      }

      const payload = {
        clinic_id: state.user.clinicId,
        child_id: selectedChildId,
        tipo: form.tipo,
        data: form.data,
        notas: form.notas || null,
        scores: numericScores,
      };

      if (selectedAval) {
        const { data: upd, error } = await supabase.from('avaliacoes').update(payload).eq('id', selectedAval.id).select().single();
        if (error) { setSaveError(error.message); return; }
        if (upd) dispatch({ type: 'SET_DATA', payload: { evaluations: data.evaluations.map((a) => a.id === upd.id ? upd : a) } });
      } else {
        const { data: created, error } = await supabase.from('avaliacoes').insert(payload).select().single();
        if (error) { setSaveError(error.message); return; }
        if (created) dispatch({ type: 'SET_DATA', payload: { evaluations: [created, ...data.evaluations] } });
      }
      setShowModal(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedChildId || !state.user?.clinicId) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Accept single object or array
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      const { supabase } = await import('@/lib/supabase');
      let count = 0;
      for (const item of items) {
        if (typeof item !== 'object' || item === null) continue;
        const row = item as Record<string, unknown>;
        const tipo = String(row.tipo ?? row.instrumento ?? 'Personalizado');
        const dataStr = String(row.data ?? row.data_avaliacao ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
        const notas = String(row.notas ?? row.observacoes ?? row.interpretacao ?? '').slice(0, 2000) || null;
        const scores: Record<string, unknown> = typeof row.scores === 'object' && row.scores !== null ? row.scores as Record<string, unknown> : {};
        if (row.instrumento_nome) scores.instrumento_nome = String(row.instrumento_nome);
        const { data: created, error } = await supabase.from('avaliacoes').insert({
          clinic_id: state.user!.clinicId,
          child_id: selectedChildId,
          tipo: TIPOS.includes(tipo as TipoAvaliacao) ? tipo : 'Personalizado',
          data: dataStr,
          notas,
          scores,
        }).select().single();
        if (!error && created) {
          dispatch({ type: 'SET_DATA', payload: { evaluations: [created, ...data.evaluations] } });
          count++;
        }
      }
      setImportMsg({ type: 'ok', text: `${count} avaliação(ões) importada(s) com sucesso!` });
    } catch {
      setImportMsg({ type: 'err', text: 'Erro ao importar. Verifique se o arquivo é um JSON válido.' });
    } finally {
      setImporting(false);
    }
  }

  async function handleXlsxFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    const raw = await parseFile(file);
    const mapped = raw.map(mapAvaliacao).filter((r) => r.child_name.trim());
    setXlsxImportRows(mapped);
    setXlsxImportState('preview');
  }

  async function handleConfirmXlsxImport() {
    setXlsxImportState('importing');
    try {
      const { supabase } = await import('@/lib/supabase');
      const clinic_id = state.user?.clinicId;
      let ok = 0; let err = 0;
      for (const row of xlsxImportRows) {
        const child = data.children.find((c) => c.name.toLowerCase().includes(row.child_name.toLowerCase().slice(0, 6)));
        const child_id = child?.id ?? selectedChildId;
        if (!child_id) { err++; continue; }
        const { data: created, error } = await supabase.from('avaliacoes').insert({
          clinic_id, child_id,
          tipo: TIPOS.includes(row.tipo as TipoAvaliacao) ? row.tipo : 'Personalizado',
          data: row.data || new Date().toISOString().slice(0, 10),
          notas: row.notas || null,
          scores: row.scores,
        }).select().single();
        if (error) err++; else if (created) { dispatch({ type: 'SET_DATA', payload: { evaluations: [created, ...data.evaluations] } }); ok++; }
      }
      setImportMsg({ type: 'ok', text: `${ok} avaliação(ões) importada(s)${err > 0 ? ` · ${err} erro(s)` : ''}` });
    } catch {
      setImportMsg({ type: 'err', text: 'Erro ao importar planilha.' });
    } finally {
      setXlsxImportRows([]); setXlsxImportState('idle');
    }
  }

  const evalsByTipo = useMemo(() => {
    const map: Record<string, Avaliacao[]> = {};
    for (const e of childEvals) {
      if (!map[e.tipo]) map[e.tipo] = [];
      map[e.tipo].push(e);
    }
    return map;
  }, [childEvals]);

  const hasDefs = SCORE_DEFS[form.tipo] !== undefined;
  const isWide = form.tipo === 'CARS' || (SCORE_DEFS[form.tipo]?.length ?? 0) >= 6;

  return (
    <div className="view show" id="v-avaliacoes">
      <div className="page-body">
        <div className="page-hero">
          <div className="ph-pre"><span></span>Avaliações</div>
          <h1 className="ph-title">Avaliações</h1>
          <div className="ph-sub">PEDI, PS, SPM, ABLLS, VBMAPP, CARS, Vineland e instrumentos personalizados</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedChildId ?? ''}
            onChange={(e) => setSelectedChildId(Number(e.target.value))}
            style={{ padding: '10px 14px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}
          >
            {data.children.length === 0 && <option value="">Nenhum paciente</option>}
            {data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedChild && (
            <span style={{ fontSize: 12, color: 'var(--t3)', padding: '4px 10px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 20 }}>
              {childEvals.length} avaliação(ões)
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--sf)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: importing ? .6 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {importing ? 'Importando...' : 'Importar JSON'}
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
            </label>
            <button
              onClick={() => xlsxFileRef.current?.click()}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--p)', background: 'var(--ps)', color: 'var(--p)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Importar Excel
            </button>
            <input ref={xlsxFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleXlsxFileSelect} />
            <button className="btn-p" onClick={openNew}>+ Nova avaliação</button>
          </div>
        </div>
        {importMsg && (
          <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: importMsg.type === 'ok' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)', border: `1px solid ${importMsg.type === 'ok' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`, fontSize: 13, fontWeight: 600, color: importMsg.type === 'ok' ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {importMsg.text}
            <button onClick={() => setImportMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {TIPOS.filter((t) => evalsByTipo[t]?.length).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 24 }}>
            {TIPOS.filter((t) => evalsByTipo[t]?.length).map((tipo) => (
              <div key={tipo} style={{ background: 'var(--ps)', border: '1px solid var(--p)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--p)' }}>{evalsByTipo[tipo].length}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginTop: 2 }}>{tipo}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                  Última: {formatDate(evalsByTipo[tipo][0].data)}
                </div>
              </div>
            ))}
          </div>
        )}

        {childEvals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--bdr)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>Nenhuma avaliação registrada</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Use PEDI, SPM, CARS, VBMAPP ou seu instrumento personalizado</div>
            <button className="btn-p" onClick={openNew}>+ Registrar primeira avaliação</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {childEvals.map((a) => {
              const savedScores = a.scores ?? {};
              const nomePersonalizado = a.tipo === 'Personalizado' ? (savedScores.instrumento_nome as string) : null;
              const defs = SCORE_DEFS[a.tipo];

              // Build score summary chips
              let scoreSummary: React.ReactNode = null;
              if (a.tipo === 'CARS') {
                const strScores: Record<string, string> = {};
                for (const k of Object.keys(savedScores)) strScores[k] = String(savedScores[k] ?? '');
                const result = carsResult(strScores);
                if (result) {
                  scoreSummary = (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: result.color, lineHeight: 1 }}>{result.total}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: result.color, background: result.color + '18', padding: '3px 10px', borderRadius: 20 }}>{result.nivel}</span>
                      <span style={{ fontSize: 11, color: 'var(--t3)' }}>CARS (15–60)</span>
                    </div>
                  );
                }
              } else if (defs) {
                const filled = defs.filter((d) => savedScores[d.key] != null && savedScores[d.key] !== '');
                if (filled.length > 0) {
                  scoreSummary = (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {filled.map((d) => (
                        <span key={d.key} style={{ fontSize: 11, padding: '3px 10px', background: 'var(--ps)', border: '1px solid var(--p)', borderRadius: 20, color: 'var(--t2)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {d.label}: <strong style={{ color: 'var(--p)' }}>{String(savedScores[d.key])}{d.unit ? ` ${d.unit}` : ''}</strong>
                        </span>
                      ))}
                    </div>
                  );
                }
              }

              return (
                <div key={a.id} onClick={() => openEdit(a)}
                  style={{ padding: '16px 18px', background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 14, cursor: 'pointer', transition: 'border-color .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--p)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--bdr)')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--ps)', border: '1px solid var(--p)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--p)', textAlign: 'center', flexShrink: 0 }}>
                      {a.tipo}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>
                        {nomePersonalizado || TIPO_DESC[a.tipo] || a.tipo}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                        {formatDate(a.data)}
                        {a.notas && <span style={{ marginLeft: 6 }}>· {a.notas.slice(0, 80)}{a.notas.length > 80 ? '...' : ''}</span>}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t3)', flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  {scoreSummary}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 800, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: 'var(--bg)', borderRadius: 20, padding: 28, width: '100%', maxWidth: isWide ? 640 : 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', margin: 0 }}>
                {selectedAval ? 'Editar avaliação' : 'Nova avaliação'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Instrumento + Data */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Instrumento *</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => handleTipoChange(e.target.value as TipoAvaliacao)}
                    style={{ ...inputStyle }}
                  >
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                    required
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>

              {/* Descrição do instrumento */}
              <div style={{ padding: '8px 12px', background: 'var(--sf2)', borderRadius: 8, fontSize: 12, color: 'var(--t3)', lineHeight: 1.4 }}>
                {TIPO_DESC[form.tipo]}
              </div>

              {/* Nome personalizado */}
              {form.tipo === 'Personalizado' && (
                <div>
                  <label style={labelStyle}>Nome do instrumento *</label>
                  <input
                    type="text"
                    value={form.instrumento_nome}
                    onChange={(e) => setForm(f => ({ ...f, instrumento_nome: e.target.value }))}
                    placeholder="Ex: Escala Própria de Independência, Protocolo de Regulação..."
                    required
                    style={{ ...inputStyle }}
                  />
                </div>
              )}

              {/* Campos estruturados por instrumento */}
              {hasDefs && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    Escores
                  </div>
                  <ScoreForm tipo={form.tipo} scores={form.scores} onChange={handleScoreChange} />
                </div>
              )}

              {/* Observações */}
              <div>
                <label style={labelStyle}>Observações / Conclusões</label>
                <textarea
                  rows={3}
                  value={form.notas}
                  onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Síntese dos resultados, perfil clínico, recomendações terapêuticas..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-p" style={{ flex: 2 }}>
                  {saving ? 'Salvando...' : selectedAval ? 'Salvar alterações' : 'Registrar avaliação'}
                </button>
              </div>
              {saveError && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.35)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
                  {saveError}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Preview Modal */}
      {(xlsxImportState === 'preview' || xlsxImportState === 'importing') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => xlsxImportState === 'preview' && setXlsxImportState('idle')}>
          <div style={{ background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg,#0891b2,#7c3aed)', padding: '18px 22px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📊</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Importar avaliações — Excel/CSV</div>
                <div style={{ fontSize: 12, opacity: .8 }}>{xlsxImportRows.length} registro(s) encontrado(s)</div>
              </div>
              {xlsxImportState === 'preview' && <button onClick={() => setXlsxImportState('idle')} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
            </div>
            <div style={{ padding: '10px 18px 0' }}>
              <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,.08)', borderLeft: '3px solid #f59e0b', borderRadius: 6, fontSize: 12, color: 'var(--t2)' }}>
                Colunas esperadas: paciente, tipo, data, notas. Demais colunas viram scores. Se o paciente não for encontrado, usa o selecionado.
              </div>
            </div>
            <div style={{ padding: '14px 20px', maxHeight: '40vh', overflowY: 'auto' }}>
              {xlsxImportRows.slice(0, 8).map((r, i) => (
                <div key={i} style={{ padding: '8px 10px', background: 'var(--sf)', borderRadius: 8, marginBottom: 6, fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.child_name || '(paciente selecionado)'}</div>
                    <div style={{ color: 'var(--t3)', fontSize: 12 }}>{r.tipo} · {r.data || 'sem data'}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', flexShrink: 0 }}>{Object.keys(r.scores).length} scores</div>
                </div>
              ))}
              {xlsxImportRows.length > 8 && <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>... e mais {xlsxImportRows.length - 8}</div>}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bdr)', display: 'flex', gap: 10 }}>
              <button onClick={() => setXlsxImportState('idle')} disabled={xlsxImportState === 'importing'} style={{ flex: 1, padding: '10px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={handleConfirmXlsxImport} disabled={xlsxImportState === 'importing'} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#0891b2,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: xlsxImportState === 'importing' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: xlsxImportState === 'importing' ? .7 : 1 }}>
                {xlsxImportState === 'importing' ? 'Importando...' : `Importar ${xlsxImportRows.length} avaliação(ões)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
