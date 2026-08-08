'use client';

import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Types ────────────────────────────────────────────────
interface Atividade {
  id: string;
  nome: string;
  descricao: string;
  categoria: Categoria;
  tipo: 'predefinida' | 'personalizada';
}

interface DttTrial { resultado: 'acerto' | 'parcial' | 'erro'; }

type Categoria = 'Comunicação' | 'Cognitivo' | 'Social' | 'Motor' | 'Sensorial' | 'Autonomia';

const CATEGORIA_COLORS: Record<Categoria, string> = {
  'Comunicação': '#3B82F6',
  'Cognitivo':   '#8B5CF6',
  'Social':      '#10B981',
  'Motor':       '#F59E0B',
  'Sensorial':   '#EF4444',
  'Autonomia':   '#EC4899',
};

// ─── Pre-defined activities ───────────────────────────────
const PREDEFINED: Atividade[] = [
  { id: 'p1', nome: 'Nomear cores primárias', descricao: 'Apresentar objetos coloridos e solicitar nomeação de cores básicas (vermelho, azul, amarelo, verde).', categoria: 'Cognitivo', tipo: 'predefinida' },
  { id: 'p2', nome: 'Seguir instrução simples (1 passo)', descricao: 'Instrução verbal de um passo: "pega", "senta", "bate palma". Registrar cada resposta.', categoria: 'Comunicação', tipo: 'predefinida' },
  { id: 'p3', nome: 'Contato visual intencional', descricao: 'Estimular a criança a fazer contato visual antes de receber o reforçador desejado.', categoria: 'Social', tipo: 'predefinida' },
  { id: 'p4', nome: 'Encaixar formas geométricas', descricao: 'Encaixar peças em tabuleiro de formas — círculo, triângulo, quadrado. Registrar cada tentativa.', categoria: 'Motor', tipo: 'predefinida' },
  { id: 'p5', nome: 'Rotina sensorial — escovação', descricao: 'Aplicar escovação sensorial nos membros superiores com pressão suave e rítmica.', categoria: 'Sensorial', tipo: 'predefinida' },
  { id: 'p6', nome: 'Vestir e tirar roupa', descricao: 'Praticar sequência de vestimenta (camisa, calça, sapato) com apoio visual e verbal mínimo.', categoria: 'Autonomia', tipo: 'predefinida' },
  { id: 'p7', nome: 'Brincar em turnos (reciprocidade)', descricao: 'Atividade de turnos com bola ou brinquedo — aguardar a vez e ceder o objeto.', categoria: 'Social', tipo: 'predefinida' },
  { id: 'p8', nome: 'Comunicação por imagem (PECS)', descricao: 'Selecionar figura para comunicar desejo ou necessidade ao terapeuta.', categoria: 'Comunicação', tipo: 'predefinida' },
  { id: 'p9', nome: 'Imitação motora grossa', descricao: 'Imitar movimentos corporais amplos do terapeuta: levantar braços, bater palmas, pular.', categoria: 'Motor', tipo: 'predefinida' },
  { id: 'p10', nome: 'Nomear objetos funcionais', descricao: 'Identificar e nomear 20 objetos do cotidiano apresentados em figuras ou objetos reais.', categoria: 'Cognitivo', tipo: 'predefinida' },
  { id: 'p11', nome: 'Rotina de higiene pessoal', descricao: 'Sequência de lavagem das mãos e escovação de dentes com suporte visual passo a passo.', categoria: 'Autonomia', tipo: 'predefinida' },
  { id: 'p12', nome: 'Solicitar ajuda verbalmente', descricao: 'Treino para pedir "ajuda" ou "mais" em situações estruturadas com reforço diferencial.', categoria: 'Comunicação', tipo: 'predefinida' },
  { id: 'p13', nome: 'Integração sensorial — balanço', descricao: 'Atividades de balanço e vestibular para regulação sensorial. Observar resposta e tolerância.', categoria: 'Sensorial', tipo: 'predefinida' },
  { id: 'p14', nome: 'Jogo simbólico simples', descricao: 'Brincar de faz de conta com objetos funcionais: xícara, colher, boneca. Modelar e aguardar imitação.', categoria: 'Social', tipo: 'predefinida' },
  { id: 'p15', nome: 'Coordenação olho-mão', descricao: 'Atividades de encaixe, empilhar, traçar. Registrar precisão e número de tentativas até acerto.', categoria: 'Motor', tipo: 'predefinida' },
  { id: 'p16', nome: 'Reconhecimento de emoções', descricao: 'Identificar expressões faciais (feliz, triste, com raiva) em figuras ou espelho.', categoria: 'Cognitivo', tipo: 'predefinida' },
];

const CATEGORIAS: Categoria[] = ['Comunicação', 'Cognitivo', 'Social', 'Motor', 'Sensorial', 'Autonomia'];

// ─── Patient selector modal (2 steps: search → confirm code) ──
function SelectPacienteModal({ atividade, pacientes, onSelect, onClose }: {
  atividade: Atividade;
  pacientes: { id: number; name: string; status: string; codigo?: string | null }[];
  onSelect: (id: number, nome: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [searchQ, setSearchQ] = useState('');
  const [picked, setPicked] = useState<{ id: number; name: string; codigo?: string | null } | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const ativos = pacientes.filter((p) => p.status === 'ativo');
  const listFiltered = searchQ.trim()
    ? ativos.filter((p) => p.name.toLowerCase().includes(searchQ.toLowerCase()))
    : ativos;

  function handlePick(p: { id: number; name: string; codigo?: string | null }) {
    setPicked(p);
    setCodeInput('');
    setCodeError('');
    setStep('confirm');
  }

  function handleConfirm() {
    if (!picked) return;
    if (!picked.codigo) { onSelect(picked.id, picked.name); return; }
    if (codeInput.trim() === picked.codigo) { onSelect(picked.id, picked.name); }
    else { setCodeError('Código incorreto. Verifique com a família e tente novamente.'); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--sh-xl)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--sf2)', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 18, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontWeight: 700, lineHeight: 1 }}>×</button>

        {step === 'select' ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Selecionar paciente</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 16 }}>{atividade.nome}</div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input autoFocus value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Buscar paciente..."
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            {listFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t3)', fontSize: 13 }}>
                {ativos.length === 0 ? 'Nenhum paciente ativo cadastrado.' : 'Nenhum paciente encontrado.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {listFiltered.map((p) => (
                  <button key={p.id} onClick={() => handlePick(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color .15s', width: '100%' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--p)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--bdr)')}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ps)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--p)', flexShrink: 0 }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{p.name}</div>
                      {p.codigo && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Código: <strong style={{ color: 'var(--p)', fontFamily: 'monospace' }}>{p.codigo}</strong></div>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', color: 'var(--p)', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Voltar
            </button>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Confirmar identidade</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 20 }}>{atividade.nome}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--ps)', border: '1px solid var(--p)', borderRadius: 14, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--p)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {picked?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{picked?.name}</div>
                {picked?.codigo && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>ID do paciente: <strong style={{ color: 'var(--p)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{picked.codigo}</strong></div>}
              </div>
            </div>
            {picked?.codigo ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.5 }}>
                  Peça à família o código do paciente e digite abaixo para confirmar:
                </div>
                <input autoFocus value={codeInput}
                  onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder="000000" maxLength={10}
                  style={{ width: '100%', padding: '12px 16px', border: `1px solid ${codeError ? '#ef4444' : 'var(--bdr)'}`, borderRadius: 12, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 22, fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.25em', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} />
                {codeError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{codeError}</div>}
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12, padding: '10px 14px', background: 'var(--sf2)', borderRadius: 10, textAlign: 'center' }}>
                Paciente sem código cadastrado — acesso liberado automaticamente.
              </div>
            )}
            <button onClick={handleConfirm} className="btn-p" style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 800 }}>
              Confirmar e iniciar sessão
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DTT Modal ────────────────────────────────────────────
function DttModal({ atividade, pacienteNome, pacienteId, clinicId, onClose }: { atividade: Atividade; pacienteNome: string; pacienteId: number; clinicId: string; onClose: () => void }) {
  const [trials, setTrials] = useState<DttTrial[]>([]);
  const [obs, setObs] = useState('');
  const [finalizado, setFinalizado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const acertos  = trials.filter((t) => t.resultado === 'acerto').length;
  const parciais = trials.filter((t) => t.resultado === 'parcial').length;
  const erros    = trials.filter((t) => t.resultado === 'erro').length;
  const total    = trials.length;
  const pct      = total > 0 ? Math.round((acertos / total) * 100) : 0;

  const addTrial = useCallback((resultado: DttTrial['resultado']) => {
    setTrials((prev) => [...prev, { resultado }]);
  }, []);

  const cor = CATEGORIA_COLORS[atividade.categoria];

  async function handleFinalizar() {
    setSalvando(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const now = new Date();
      await supabase.from('sessoes').insert({
        clinic_id: clinicId,
        child_id: pacienteId,
        data: now.toISOString().slice(0, 10),
        hora: now.toTimeString().slice(0, 5),
        tipo: `DTT - ${atividade.nome}`,
        status: 'realizado',
        notas: JSON.stringify({ acertos, parciais, erros, total, pct, obs: obs || null, categoria: atividade.categoria }),
      });
    } catch { /* falha silenciosa */ }
    finally { setSalvando(false); setFinalizado(true); }
  }

  if (finalizado) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: 'var(--sh-xl)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#10b98120', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)', marginBottom: 8 }}>Sessão finalizada</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}>{atividade.nome}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[['Acertos', acertos, '#10b981'], ['Parciais', parciais, '#f59e0b'], ['Erros', erros, '#ef4444']].map(([l, v, c]) => (
              <div key={String(l)} style={{ background: `${c}18`, borderRadius: 12, padding: '14px 8px' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: String(c), lineHeight: 1 }}>{String(v)}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{String(l)}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: pct >= 70 ? '#10b981' : '#f59e0b', marginBottom: 4 }}>{pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 24 }}>{total} tentativas no total</div>
          <button onClick={onClose} className="btn-p" style={{ width: '100%', padding: 14, fontSize: 15 }}>Concluir</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, boxShadow: 'var(--sh-xl)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--sf2)', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 18, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontWeight: 700, lineHeight: 1 }}>×</button>

        {/* Paciente + categoria */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'var(--t1)', background: 'var(--sf2)', border: '1px solid var(--bdr)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {pacienteNome}
          </div>
          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: cor, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {atividade.categoria}
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)', marginBottom: 20, lineHeight: 1.2 }}>{atividade.nome}</h2>

        {/* Trial counter */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 900, color: cor, lineHeight: 1 }}>{total + 1}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>Tentativa atual</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button onClick={() => addTrial('acerto')} style={{ padding: '18px 8px', borderRadius: 14, border: 'none', background: '#10b981', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'opacity .1s' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><polyline points="18 5 9 16 4 11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Acerto</span>
          </button>
          <button onClick={() => addTrial('parcial')} style={{ padding: '18px 8px', borderRadius: 14, border: 'none', background: '#f59e0b', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'opacity .1s' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/><line x1="11" y1="3" x2="11" y2="19" stroke="#fff" strokeWidth="2"/></svg>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Parcial</span>
          </button>
          <button onClick={() => addTrial('erro')} style={{ padding: '18px 8px', borderRadius: 14, border: 'none', background: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'opacity .1s' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="5" y1="5" x2="17" y2="17" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/><line x1="17" y1="5" x2="5" y2="17" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Erro</span>
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t3)', marginBottom: 5 }}>
            <span>{pct}% de acertos</span>
            <span>{total} tentativas</span>
          </div>
          <div style={{ height: 6, background: 'var(--sf2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? '#10b981' : '#f59e0b', borderRadius: 3, transition: 'width .2s ease' }} />
          </div>
        </div>

        {/* Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[['ACERTOS', acertos, '#10b981'], ['PARCIAIS', parciais, '#f59e0b'], ['ERROS', erros, '#ef4444']].map(([l, v, c]) => (
            <div key={String(l)} style={{ background: `${c}15`, borderRadius: 12, padding: '12px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: String(c), lineHeight: 1 }}>{String(v)}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{String(l)}</div>
            </div>
          ))}
        </div>

        {/* Undo last trial */}
        {total > 0 && (
          <button onClick={() => setTrials((t) => t.slice(0, -1))} style={{ width: '100%', padding: '8px', marginBottom: 10, border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Desfazer última tentativa
          </button>
        )}

        {/* Observations */}
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações desta sessão (opcional)..." rows={2}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 12, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

        <button onClick={handleFinalizar} disabled={salvando} className="btn-p" style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 800 }}>
          {salvando ? 'Salvando...' : 'Finalizar Sessão'}
        </button>
      </div>
    </div>
  );
}

// ─── Activity card ────────────────────────────────────────
function AtividadeCard({ atividade, onExecutar, onEdit }: { atividade: Atividade; onExecutar: () => void; onEdit?: () => void }) {
  const cor = CATEGORIA_COLORS[atividade.categoria];
  return (
    <div style={{ background: 'var(--sf)', border: `1px solid var(--bdr)`, borderTop: `3px solid ${cor}`, borderRadius: 16, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#fff', background: cor, whiteSpace: 'nowrap' }}>
          {atividade.categoria}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', background: 'var(--sf2)', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {atividade.tipo === 'predefinida' ? 'Pré-definida' : 'Personalizada'}
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 6, lineHeight: 1.3 }}>{atividade.nome}</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>{atividade.descricao}</div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        {onEdit && (
          <button onClick={onEdit} style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 10, background: 'none', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Editar
          </button>
        )}
        <button onClick={onExecutar} style={{ flex: 1, padding: '9px 0', background: cor, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Executar
        </button>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────
export default function PeiScreen() {
  const { state } = useApp();

  const [catFilter, setCatFilter] = useState<Categoria | 'Todas'>('Todas');
  const [search, setSearch] = useState('');
  const [selectingPaciente, setSelectingPaciente] = useState<Atividade | null>(null);
  const [executing, setExecuting] = useState<{ atividade: Atividade; pacienteId: number; pacienteNome: string } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [customActivities, setCustomActivities] = useState<Atividade[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('to_custom_atividades') ?? '[]'); } catch { return []; }
  });
  const [editingCustom, setEditingCustom] = useState<Atividade | null>(null);
  const [newForm, setNewForm] = useState({ nome: '', descricao: '', categoria: 'Comunicação' as Categoria });

  const allAtividades = useMemo(() => [...PREDEFINED, ...customActivities], [customActivities]);

  const filtered = useMemo(() => {
    let list = allAtividades;
    if (catFilter !== 'Todas') list = list.filter((a) => a.categoria === catFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((a) => a.nome.toLowerCase().includes(s) || a.descricao.toLowerCase().includes(s));
    }
    return list;
  }, [allAtividades, catFilter, search]);

  function saveCustom(ativ: Atividade) {
    setCustomActivities((prev) => {
      const idx = prev.findIndex((a) => a.id === ativ.id);
      const next = idx >= 0 ? prev.map((a) => a.id === ativ.id ? ativ : a) : [...prev, ativ];
      localStorage.setItem('to_custom_atividades', JSON.stringify(next));
      return next;
    });
  }

  function handleSaveNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.nome.trim()) return;
    const ativ: Atividade = {
      id: editingCustom?.id ?? `c_${Date.now()}`,
      nome: newForm.nome.trim(),
      descricao: newForm.descricao.trim(),
      categoria: newForm.categoria,
      tipo: 'personalizada',
    };
    saveCustom(ativ);
    setShowNewModal(false);
    setEditingCustom(null);
    setNewForm({ nome: '', descricao: '', categoria: 'Comunicação' });
  }

  function openEdit(a: Atividade) {
    setEditingCustom(a);
    setNewForm({ nome: a.nome, descricao: a.descricao, categoria: a.categoria });
    setShowNewModal(true);
  }

  const activePatientsCount = state.data.children.filter((c) => c.status === 'ativo').length;

  return (
    <div className="view show" id="v-atividades">
      <div className="page-body">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--t1)', margin: 0, letterSpacing: '-.5px' }}>Atividades</h1>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>Selecione uma atividade para executar e registrar as tentativas em tempo real</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar atividade..."
                style={{ paddingLeft: 36, paddingRight: 14, height: 38, border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', width: 200, outline: 'none' }} />
            </div>
            <button className="btn-p" onClick={() => { setEditingCustom(null); setNewForm({ nome: '', descricao: '', categoria: 'Comunicação' }); setShowNewModal(true); }}>
              + Nova Atividade
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {(['Todas', ...CATEGORIAS] as (Categoria | 'Todas')[]).map((cat) => {
            const active = catFilter === cat;
            const cor = cat === 'Todas' ? 'var(--p)' : CATEGORIA_COLORS[cat as Categoria];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                padding: '7px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                border: `1.5px solid ${active ? cor : 'var(--bdr)'}`,
                background: active ? (cat === 'Todas' ? 'var(--ps)' : cor + '20') : 'none',
                color: active ? (cat === 'Todas' ? 'var(--p)' : cor) : 'var(--t2)',
              }}>
                {cat}
              </button>
            );
          })}
        </div>

        {/* Count */}
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16, fontWeight: 600 }}>
          {filtered.length} atividade{filtered.length !== 1 ? 's' : ''} {catFilter !== 'Todas' ? `em ${catFilter}` : ''}
          {activePatientsCount > 0 && <span> · {activePatientsCount} paciente{activePatientsCount !== 1 ? 's' : ''} ativo{activePatientsCount !== 1 ? 's' : ''}</span>}
        </div>

        {/* Activity grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>Nenhuma atividade encontrada</div>
            <button className="btn-p" onClick={() => { setEditingCustom(null); setNewForm({ nome: '', descricao: '', categoria: catFilter === 'Todas' ? 'Comunicação' : catFilter as Categoria }); setShowNewModal(true); }} style={{ marginTop: 8 }}>
              + Criar nova atividade
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {filtered.map((ativ) => (
              <AtividadeCard
                key={ativ.id}
                atividade={ativ}
                onExecutar={() => setSelectingPaciente(ativ)}
                onEdit={ativ.tipo === 'personalizada' ? () => openEdit(ativ) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Patient selector modal */}
      {selectingPaciente && (
        <SelectPacienteModal
          atividade={selectingPaciente}
          pacientes={state.data.children as { id: number; name: string; status: string; codigo?: string | null }[]}
          onSelect={(id, nome) => {
            setExecuting({ atividade: selectingPaciente, pacienteId: id, pacienteNome: nome });
            setSelectingPaciente(null);
          }}
          onClose={() => setSelectingPaciente(null)}
        />
      )}

      {/* DTT Execution Modal */}
      {executing && (
        <DttModal
          atividade={executing.atividade}
          pacienteNome={executing.pacienteNome}
          pacienteId={executing.pacienteId}
          clinicId={state.user?.clinicId ?? ''}
          onClose={() => setExecuting(null)}
        />
      )}

      {/* New/Edit Activity Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowNewModal(false)}>
          <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 460, boxShadow: 'var(--sh-xl)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--t1)', margin: 0 }}>{editingCustom ? 'Editar atividade' : 'Nova atividade'}</h2>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleSaveNew} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Nome da atividade *</label>
                <input value={newForm.nome} onChange={(e) => setNewForm((f) => ({ ...f, nome: e.target.value }))} required placeholder="Ex: Nomear animais domésticos"
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Categoria</label>
                <select value={newForm.categoria} onChange={(e) => setNewForm((f) => ({ ...f, categoria: e.target.value as Categoria }))}
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit' }}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Descrição / Procedimento</label>
                <textarea rows={3} value={newForm.descricao} onChange={(e) => setNewForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o procedimento da atividade..."
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--bdr)', borderRadius: 11, background: 'var(--sf2)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowNewModal(false)} style={{ flex: 1, padding: 12, border: '1px solid var(--bdr)', borderRadius: 11, background: 'none', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" className="btn-p" style={{ flex: 2 }}>{editingCustom ? 'Salvar alterações' : 'Criar atividade'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
