'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import type { QuestionarioResposta } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// DEFINIÇÕES DOS INSTRUMENTOS
// ─────────────────────────────────────────────────────────────

type NivelRisco = 'baixo' | 'medio' | 'alto' | 'clinico' | 'normal' | 'sugestivo' | 'atencao';
interface Resultado {
  total: number;
  nivel: NivelRisco;
  cor: string;
  label: string;
  interpretacao: string;
  recomendacao: string;
  detalhe: Record<string, number>;
}
interface Questao {
  id: string;
  num: number;
  texto: string;
  categoria?: string;
  opcoes: { valor: string | number; label: string }[];
  riscoSe?: string | number; // M-CHAT-R
}
interface Instrumento {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  faixaEtaria: string;
  respondente: string;
  tempo: string;
  cor: string;
  questoes: Questao[];
  calcular: (r: Record<string, string | number>) => Resultado;
}

// ── M-CHAT-R ──────────────────────────────────────────────
const MCHAT_Q: Questao[] = [
  { id:'q1', num:1, texto:'Se você apontar para algo no outro lado do quarto, seu filho olha para ele?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q2', num:2, texto:'Você já se perguntou se seu filho pode ter surdez?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'sim' },
  { id:'q3', num:3, texto:'Seu filho brinca de faz-de-conta? (ex: finge beber de copo vazio, falar no telefone, alimentar boneca)', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q4', num:4, texto:'Seu filho gosta de subir em coisas? (móveis, parquinho, escadas)', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q5', num:5, texto:'Seu filho faz movimentos incomuns com os dedos perto dos olhos? (ex: mexe os dedos perto do rosto)', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'sim' },
  { id:'q6', num:6, texto:'Seu filho aponta com o dedo indicador para pedir algo ou pedir ajuda?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q7', num:7, texto:'Seu filho aponta com o dedo para mostrar algo interessante para você?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao', categoria:'crítico' },
  { id:'q8', num:8, texto:'Seu filho tem interesse em outras crianças?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q9', num:9, texto:'Seu filho mostra coisas para você (trazendo ou erguendo) — não para pedir ajuda, mas só para compartilhar?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao', categoria:'crítico' },
  { id:'q10',num:10,texto:'Seu filho responde ao próprio nome quando você o chama?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q11',num:11,texto:'Quando você sorri para o seu filho, ele sorri de volta?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao', categoria:'crítico' },
  { id:'q12',num:12,texto:'Seu filho fica muito incomodado com barulhos do cotidiano? (aspirador, música alta, etc.)', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'sim' },
  { id:'q13',num:13,texto:'Seu filho anda?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q14',num:14,texto:'Seu filho olha nos seus olhos quando você fala, brinca ou o veste?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q15',num:15,texto:'Seu filho tenta imitar o que você faz? (ex: fazer tchau, bater palmas, fazer caretinhas)', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q16',num:16,texto:'Se você virar a cabeça para olhar algo, seu filho olha ao redor para ver o que você está vendo?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao', categoria:'crítico' },
  { id:'q17',num:17,texto:'Seu filho tenta fazer com que você preste atenção nele?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q18',num:18,texto:'Seu filho entende quando você pede para ele fazer algo sem apontar? (ex: "pegue o livro", "me traga o cobertor")', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q19',num:19,texto:'Se algo novo acontece, seu filho olha para o seu rosto para ver como você se sente?', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
  { id:'q20',num:20,texto:'Seu filho gosta de atividades de movimento? (ex: ser embalado, pular no joelho)', opcoes:[{valor:'sim',label:'Sim'},{valor:'nao',label:'Não'}], riscoSe:'nao' },
];

// ── CARS (15 itens) ────────────────────────────────────────
const CARS_ESCALA = [
  {valor:'1',label:'1 — Dentro do esperado para a idade'},
  {valor:'1.5',label:'1.5'},
  {valor:'2',label:'2 — Levemente fora do esperado'},
  {valor:'2.5',label:'2.5'},
  {valor:'3',label:'3 — Moderadamente fora do esperado'},
  {valor:'3.5',label:'3.5'},
  {valor:'4',label:'4 — Gravemente fora do esperado'},
];
const CARS_Q: Questao[] = [
  { id:'c1', num:1, categoria:'Relações Sociais', texto:'Relação com Pessoas — Como a criança se relaciona com pessoas ao redor?', opcoes: CARS_ESCALA },
  { id:'c2', num:2, categoria:'Imitação', texto:'Imitação — A criança imita sons, palavras e ações de outras pessoas?', opcoes: CARS_ESCALA },
  { id:'c3', num:3, categoria:'Resposta Emocional', texto:'Resposta Emocional — As respostas emocionais da criança são adequadas à situação?', opcoes: CARS_ESCALA },
  { id:'c4', num:4, categoria:'Uso do Corpo', texto:'Uso do Corpo — A criança usa o corpo de forma incomum? (maneirismos, estereotipias)', opcoes: CARS_ESCALA },
  { id:'c5', num:5, categoria:'Uso de Objetos', texto:'Uso de Objetos — A criança usa brinquedos e objetos de forma funcional e criativa?', opcoes: CARS_ESCALA },
  { id:'c6', num:6, categoria:'Adaptação', texto:'Adaptação a Mudanças — Como a criança reage a mudanças de rotina ou ambiente?', opcoes: CARS_ESCALA },
  { id:'c7', num:7, categoria:'Visão', texto:'Resposta Visual — Como a criança usa a visão e o olhar?', opcoes: CARS_ESCALA },
  { id:'c8', num:8, categoria:'Audição', texto:'Resposta Auditiva — Como a criança responde a sons e à fala?', opcoes: CARS_ESCALA },
  { id:'c9', num:9, categoria:'Sentidos', texto:'Olfato, Tato e Paladar — A criança tem respostas incomuns a cheiros, texturas e sabores?', opcoes: CARS_ESCALA },
  { id:'c10',num:10,categoria:'Medo/Ansiedade', texto:'Medo e Ansiedade — A criança apresenta medos ou ansiedade inapropriados para a situação?', opcoes: CARS_ESCALA },
  { id:'c11',num:11,categoria:'Comunicação Verbal', texto:'Comunicação Verbal — Como é a linguagem oral da criança?', opcoes: CARS_ESCALA },
  { id:'c12',num:12,categoria:'Comunicação Não-Verbal', texto:'Comunicação Não-Verbal — A criança usa gestos, expressões e outras formas não-verbais?', opcoes: CARS_ESCALA },
  { id:'c13',num:13,categoria:'Nível de Atividade', texto:'Nível de Atividade — A atividade motora é adequada? (hiperatividade ou hipoatividade)', opcoes: CARS_ESCALA },
  { id:'c14',num:14,categoria:'Intelecto', texto:'Nível e Consistência Intelectual — O desempenho intelectual é consistente entre as áreas?', opcoes: CARS_ESCALA },
  { id:'c15',num:15,categoria:'Impressão Geral', texto:'Impressão Geral de Autismo — Baseado em toda a observação, qual é o grau geral de autismo?', opcoes: CARS_ESCALA },
];

// ── SDQ Pais (25 itens) ────────────────────────────────────
const SDQ_OPCOES = [{valor:'0',label:'Não é verdade'},{valor:'1',label:'Um pouco verdade'},{valor:'2',label:'Absolutamente verdade'}];
const SDQ_Q: Questao[] = [
  // Pró-social (1,4,9,17,20)
  { id:'s1', num:1, categoria:'prosocial', texto:'Tenta ser simpático(a) com os outros. Considera os sentimentos das pessoas.' , opcoes:SDQ_OPCOES },
  { id:'s2', num:2, categoria:'hiper',     texto:'Está sempre agitado(a), mexendo em tudo ou se contorcendo.' , opcoes:SDQ_OPCOES },
  { id:'s3', num:3, categoria:'emocional', texto:'Se queixa frequentemente de dor de cabeça, dor de estômago ou enjoo.' , opcoes:SDQ_OPCOES },
  { id:'s4', num:4, categoria:'prosocial', texto:'Compartilha com outras crianças (doces, brinquedos, lápis, etc.).' , opcoes:SDQ_OPCOES },
  { id:'s5', num:5, categoria:'conduta',   texto:'Tem muitas birras ou mau-humor.' , opcoes:SDQ_OPCOES },
  { id:'s6', num:6, categoria:'pares',     texto:'É mais solitário(a), tende a brincar sozinho(a).' , opcoes:SDQ_OPCOES },
  { id:'s7', num:7, categoria:'conduta',   texto:'Geralmente obediente, faz o que os adultos pedem. (reverso)', opcoes:SDQ_OPCOES },
  { id:'s8', num:8, categoria:'emocional', texto:'Preocupa-se bastante; parece ansioso(a) ou com muitas preocupações.' , opcoes:SDQ_OPCOES },
  { id:'s9', num:9, categoria:'prosocial', texto:'Ajuda outras pessoas quando estão magoadas, chateadas ou doentes.' , opcoes:SDQ_OPCOES },
  { id:'s10',num:10,categoria:'hiper',     texto:'Está sempre mexendo em tudo; não consegue ficar sentado(a) quieto(a) por muito tempo.' , opcoes:SDQ_OPCOES },
  { id:'s11',num:11,categoria:'pares',     texto:'Tem pelo menos um(a) bom(boa) amigo(a). (reverso)', opcoes:SDQ_OPCOES },
  { id:'s12',num:12,categoria:'conduta',   texto:'Briga frequentemente com outras crianças ou as amedronta.' , opcoes:SDQ_OPCOES },
  { id:'s13',num:13,categoria:'emocional', texto:'É frequentemente infeliz, desanimado(a) ou chora muito.' , opcoes:SDQ_OPCOES },
  { id:'s14',num:14,categoria:'pares',     texto:'Em geral é querido(a) pelas outras crianças. (reverso)', opcoes:SDQ_OPCOES },
  { id:'s15',num:15,categoria:'hiper',     texto:'Distrai-se facilmente, perde a concentração.' , opcoes:SDQ_OPCOES },
  { id:'s16',num:16,categoria:'emocional', texto:'É nervoso(a) em situações novas; facilmente perde a confiança em si mesmo(a).' , opcoes:SDQ_OPCOES },
  { id:'s17',num:17,categoria:'prosocial', texto:'É gentil com crianças mais novas.' , opcoes:SDQ_OPCOES },
  { id:'s18',num:18,categoria:'conduta',   texto:'Frequentemente mente ou engana.' , opcoes:SDQ_OPCOES },
  { id:'s19',num:19,categoria:'pares',     texto:'É intimidado(a) ou atormentado(a) por outras crianças.' , opcoes:SDQ_OPCOES },
  { id:'s20',num:20,categoria:'prosocial', texto:'Frequentemente se oferece para ajudar (pais, professores, outras crianças).' , opcoes:SDQ_OPCOES },
  { id:'s21',num:21,categoria:'hiper',     texto:'Pensa antes de agir. (reverso)', opcoes:SDQ_OPCOES },
  { id:'s22',num:22,categoria:'conduta',   texto:'Pega coisas que não lhe pertencem (em casa, na escola ou em outros lugares).' , opcoes:SDQ_OPCOES },
  { id:'s23',num:23,categoria:'pares',     texto:'Se dá melhor com adultos do que com outras crianças.' , opcoes:SDQ_OPCOES },
  { id:'s24',num:24,categoria:'emocional', texto:'Tem muitos medos; assusta-se facilmente.' , opcoes:SDQ_OPCOES },
  { id:'s25',num:25,categoria:'hiper',     texto:'Termina as tarefas que começa; tem boa atenção. (reverso)', opcoes:SDQ_OPCOES },
];
const SDQ_REVERSOS = new Set(['s7','s11','s14','s21','s25']);

// ── SNAP-IV (18 itens) ─────────────────────────────────────
const SNAP_OPCOES = [{valor:'0',label:'0 — De forma alguma'},{valor:'1',label:'1 — Só um pouco'},{valor:'2',label:'2 — Bastante'},{valor:'3',label:'3 — Muito'}];
const SNAP_Q: Questao[] = [
  // Desatenção (1-9)
  { id:'n1', num:1, categoria:'inaten', texto:'Não presta atenção a detalhes ou comete erros por descuido nas tarefas escolares ou outras atividades.' , opcoes:SNAP_OPCOES },
  { id:'n2', num:2, categoria:'inaten', texto:'Tem dificuldade em manter a atenção em tarefas ou atividades de lazer.' , opcoes:SNAP_OPCOES },
  { id:'n3', num:3, categoria:'inaten', texto:'Parece não escutar quando lhe falam diretamente.' , opcoes:SNAP_OPCOES },
  { id:'n4', num:4, categoria:'inaten', texto:'Não segue instruções e não termina tarefas (não por falta de compreensão ou desafio).' , opcoes:SNAP_OPCOES },
  { id:'n5', num:5, categoria:'inaten', texto:'Tem dificuldade para organizar tarefas e atividades.' , opcoes:SNAP_OPCOES },
  { id:'n6', num:6, categoria:'inaten', texto:'Evita ou reluta em tarefas que exigem esforço mental prolongado.' , opcoes:SNAP_OPCOES },
  { id:'n7', num:7, categoria:'inaten', texto:'Perde objetos necessários para tarefas (lápis, livros, brinquedos, etc.).' , opcoes:SNAP_OPCOES },
  { id:'n8', num:8, categoria:'inaten', texto:'Distrai-se facilmente com estímulos externos.' , opcoes:SNAP_OPCOES },
  { id:'n9', num:9, categoria:'inaten', texto:'É esquecido(a) nas atividades do dia-a-dia.' , opcoes:SNAP_OPCOES },
  // Hiperatividade-Impulsividade (10-18)
  { id:'n10',num:10,categoria:'hip', texto:'Mexe as mãos e os pés ou se remexe na cadeira.' , opcoes:SNAP_OPCOES },
  { id:'n11',num:11,categoria:'hip', texto:'Levanta-se da cadeira em situações em que deveria permanecer sentado(a).' , opcoes:SNAP_OPCOES },
  { id:'n12',num:12,categoria:'hip', texto:'Corre ou escala coisas em situações inapropriadas.' , opcoes:SNAP_OPCOES },
  { id:'n13',num:13,categoria:'hip', texto:'Tem dificuldade para brincar ou envolver-se em atividades de lazer silenciosamente.' , opcoes:SNAP_OPCOES },
  { id:'n14',num:14,categoria:'hip', texto:'Está "a mil" ou age como se tivesse um motor no corpo.' , opcoes:SNAP_OPCOES },
  { id:'n15',num:15,categoria:'hip', texto:'Fala demais.' , opcoes:SNAP_OPCOES },
  { id:'n16',num:16,categoria:'hip', texto:'Responde antes de a pergunta ser completada.' , opcoes:SNAP_OPCOES },
  { id:'n17',num:17,categoria:'hip', texto:'Tem dificuldade em aguardar a sua vez.' , opcoes:SNAP_OPCOES },
  { id:'n18',num:18,categoria:'hip', texto:'Interrompe ou se intromete em conversas e/ou atividades de outros.' , opcoes:SNAP_OPCOES },
];

// ─────────────────────────────────────────────────────────────
// FUNÇÕES DE CÁLCULO
// ─────────────────────────────────────────────────────────────

function calcMCHAT(r: Record<string, string | number>): Resultado {
  const criticos = ['q2','q7','q9','q11','q16'];
  let total = 0;
  let criticosFalhou = 0;
  MCHAT_Q.forEach(q => {
    if (String(r[q.id]) === String(q.riscoSe)) {
      total++;
      if (criticos.includes(q.id)) criticosFalhou++;
    }
  });
  const alto = total >= 8 || criticosFalhou >= 2;
  const medio = total >= 3;
  const nivel: NivelRisco = alto ? 'alto' : medio ? 'medio' : 'baixo';
  const cores: Record<NivelRisco, string> = { baixo:'#22c55e', medio:'#f59e0b', alto:'#ef4444', clinico:'#7c3aed', normal:'#22c55e', sugestivo:'#f59e0b', atencao:'#f59e0b' };
  const labels = { baixo:'Risco Baixo', medio:'Risco Médio', alto:'Risco Alto' };
  const interp = {
    baixo: 'Pontuação dentro do esperado. Risco baixo para TEA. Reavalie em 24 meses se houver preocupações futuras.',
    medio: 'Risco moderado detectado. Recomenda-se aplicar o Follow-Up (M-CHAT-R/F) e reavaliação em 1 mês.',
    alto:  'Alto risco para TEA. Encaminhamento imediato para avaliação diagnóstica especializada.',
  };
  return { total, nivel, cor: cores[nivel], label: labels[nivel] || nivel, detalhe: { criticos_falhou: criticosFalhou }, interpretacao: interp[nivel] || '', recomendacao: nivel === 'alto' ? 'Encaminhar para neuropediatra ou psicólogo especializado em TEA imediatamente.' : nivel === 'medio' ? 'Reavaliar em 1 mês. Aplicar seção de Follow-Up do M-CHAT-R/F.' : 'Manter acompanhamento de rotina. Reavaliar no próximo marco de desenvolvimento.' };
}

function calcCARS(r: Record<string, string | number>): Resultado {
  let total = 0;
  const detalhe: Record<string, number> = {};
  CARS_Q.forEach(q => {
    const v = parseFloat(String(r[q.id] || '1'));
    total += v;
    detalhe[q.categoria || q.id] = v;
  });
  total = Math.round(total * 10) / 10;
  const nivel: NivelRisco = total >= 37 ? 'alto' : total >= 30 ? 'medio' : 'normal';
  const labels = { normal: 'Sem Indicadores de TEA', medio: 'TEA Leve-Moderado', alto: 'TEA Grave' } as Record<string, string>;
  const interp = { normal: 'Pontuação abaixo do ponto de corte clínico (< 30). Sem indicadores significativos de autismo nesta avaliação.', medio: 'Pontuação entre 30 e 36,5 indica TEA de grau leve a moderado. Confirmar com avaliação multidisciplinar completa.', alto: 'Pontuação ≥ 37 indica TEA grave. Avaliar necessidade de suporte intensivo e encaminhamento especializado.' };
  return { total, nivel, cor: nivel === 'alto' ? '#ef4444' : nivel === 'medio' ? '#f59e0b' : '#22c55e', label: labels[nivel] || nivel, detalhe, interpretacao: interp[nivel] || '', recomendacao: nivel !== 'normal' ? 'Integrar com avaliação clínica, ADOS-2/ADI-R se disponível, avaliação neurológica e de linguagem.' : 'Monitorar desenvolvimento. Repetir avaliação se houver mudanças no comportamento.' };
}

function calcSDQ(r: Record<string, string | number>): Resultado {
  const subs = { emocional:0, conduta:0, hiper:0, pares:0, prosocial:0 };
  SDQ_Q.forEach(q => {
    let v = parseInt(String(r[q.id] || '0'));
    if (SDQ_REVERSOS.has(q.id)) v = 2 - v;
    (subs as Record<string, number>)[q.categoria!] = ((subs as Record<string, number>)[q.categoria!] || 0) + v;
  });
  const total = subs.emocional + subs.conduta + subs.hiper + subs.pares;
  const nivel: NivelRisco = total >= 17 ? 'clinico' : total >= 14 ? 'atencao' : 'normal';
  const labels = { normal: 'Normal', atencao: 'Limítrofe', clinico: 'Clínico' } as Record<string, string>;
  const interp = { normal: `Total de dificuldades ${total}/40 — dentro do esperado. Comportamento pró-social: ${subs.prosocial}/10.`, atencao: `Total de dificuldades ${total}/40 — zona limítrofe. Monitorar evolução e coletar avaliação de professores.`, clinico: `Total de dificuldades ${total}/40 — nível clínico. Avaliação psicológica aprofundada recomendada.` };
  return { total, nivel, cor: nivel === 'clinico' ? '#ef4444' : nivel === 'atencao' ? '#f59e0b' : '#22c55e', label: labels[nivel] || nivel, detalhe: { ...subs, total_dificuldades: total }, interpretacao: interp[nivel] || '', recomendacao: nivel === 'clinico' ? 'Buscar avaliação psicológica e psiquiátrica. Envolver escola no acompanhamento.' : nivel === 'atencao' ? 'Coletar versão do professor. Reavaliar em 3-6 meses.' : 'Manter acompanhamento de rotina.' };
}

function calcSNAP(r: Record<string, string | number>): Resultado {
  let inaten = 0, hip = 0;
  SNAP_Q.forEach(q => {
    const v = parseInt(String(r[q.id] || '0'));
    if (q.categoria === 'inaten') inaten += v; else hip += v;
  });
  const medInaten = Math.round((inaten / 9) * 100) / 100;
  const medHip = Math.round((hip / 9) * 100) / 100;
  const total = inaten + hip;
  const clinI = medInaten >= 1.78, clinH = medHip >= 1.44;
  const nivel: NivelRisco = (clinI && clinH) ? 'clinico' : (clinI || clinH) ? 'sugestivo' : 'normal';
  const tipo = clinI && clinH ? 'Combinado' : clinI ? 'Predominantemente Desatento' : clinH ? 'Predominantemente Hiperativo-Impulsivo' : 'Abaixo do limiar clínico';
  const labels = { normal: 'Sem Indicadores de TDAH', sugestivo: 'Sugestivo de TDAH', clinico: `TDAH — Tipo ${tipo}` } as Record<string, string>;
  return { total, nivel, cor: nivel === 'clinico' ? '#ef4444' : nivel === 'sugestivo' ? '#f59e0b' : '#22c55e', label: labels[nivel] || tipo, detalhe: { desatencao: inaten, hiperatividade: hip, media_desatencao: medInaten, media_hiperatividade: medHip }, interpretacao: `Desatenção: ${inaten}/27 (média ${medInaten}). Hiperatividade-Impulsividade: ${hip}/27 (média ${medHip}). ${tipo}.`, recomendacao: nivel !== 'normal' ? 'Avaliação neuropsicológica e neuropediátrica recomendada. Coletar avaliação do professor para confirmar o quadro em múltiplos contextos.' : 'Sem indicadores de TDAH nesta avaliação.' };
}

// ─────────────────────────────────────────────────────────────
// CATÁLOGO DE INSTRUMENTOS
// ─────────────────────────────────────────────────────────────
const INSTRUMENTOS: Record<string, Instrumento> = {
  'M-CHAT-R': {
    id: 'M-CHAT-R', sigla: 'M-CHAT-R', nome: 'M-CHAT-R/F',
    descricao: 'Modified Checklist for Autism in Toddlers — rastreio de autismo para crianças de 16 a 30 meses.',
    faixaEtaria: '16–30 meses', respondente: 'Pais / Responsáveis', tempo: '5–10 min',
    cor: '#3b82f6', questoes: MCHAT_Q, calcular: calcMCHAT,
  },
  'CARS': {
    id: 'CARS', sigla: 'CARS-2', nome: 'CARS-2 — Childhood Autism Rating Scale',
    descricao: 'Escala de avaliação padronizada para diagnóstico de autismo. Aplicada por clínico treinado em sessão de observação.',
    faixaEtaria: '2+ anos', respondente: 'Terapeuta / Clínico', tempo: '30–45 min',
    cor: '#7c3aed', questoes: CARS_Q, calcular: calcCARS,
  },
  'SDQ': {
    id: 'SDQ', sigla: 'SDQ', nome: 'SDQ — Strengths and Difficulties Questionnaire',
    descricao: 'Questionário de Capacidades e Dificuldades para triagem de saúde mental e comportamento em crianças e adolescentes.',
    faixaEtaria: '2–17 anos', respondente: 'Pais / Responsáveis', tempo: '5 min',
    cor: '#059669', questoes: SDQ_Q, calcular: calcSDQ,
  },
  'SNAP-IV': {
    id: 'SNAP-IV', sigla: 'SNAP-IV', nome: 'SNAP-IV — Escala de Avaliação de TDAH',
    descricao: 'Avaliação dos 18 critérios diagnósticos de TDAH do DSM-IV para triagem de desatenção e hiperatividade-impulsividade.',
    faixaEtaria: '5–17 anos', respondente: 'Pais / Professores', tempo: '10 min',
    cor: '#d97706', questoes: SNAP_Q, calcular: calcSNAP,
  },
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

type Fase = 'lista' | 'selecionar' | 'preencher' | 'resultado' | 'importar' | 'visualizar';

export default function QuestionariosScreen() {
  const { state } = useApp();
  const { data } = state;
  const [selectedChildId, setSelectedChildId] = useState<number | null>(data.children[0]?.id ?? null);
  const [fase, setFase] = useState<Fase>('lista');
  const [instrKey, setInstrKey] = useState<string>('');
  const [respostas, setRespostas] = useState<Record<string, string | number>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [historico, setHistorico] = useState<QuestionarioResposta[]>([]);
  const [viewItem, setViewItem] = useState<QuestionarioResposta | null>(null);
  const [respondente, setRespondente] = useState('');
  const [obs, setObs] = useState('');
  const [dataAval, setDataAval] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importTxt, setImportTxt] = useState('');
  const [importErr, setImportErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const pac = data.children.find(c => c.id === selectedChildId) ?? null;
  const clinicId = state.user?.clinicId ?? '';
  const instr = INSTRUMENTOS[instrKey];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (pac && clinicId) loadHistorico(); }, [selectedChildId, clinicId]);

  async function loadHistorico() {
    if (!pac || !clinicId) return;
    setLoading(true);
    const { data } = await supabase
      .from('questionarios_respostas')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('child_id', pac.id)
      .order('data_avaliacao', { ascending: false });
    setHistorico((data as QuestionarioResposta[]) ?? []);
    setLoading(false);
  }

  function iniciarQuestionario(key: string) {
    setInstrKey(key);
    setRespostas({});
    setResultado(null);
    setRespondente('');
    setObs('');
    setDataAval(new Date().toISOString().slice(0, 10));
    setFase('preencher');
  }

  function calcularResultado() {
    if (!instr) return;
    const res = instr.calcular(respostas);
    setResultado(res);
    setFase('resultado');
  }

  async function salvarResultado() {
    if (!pac || !clinicId || !resultado || !instr) return;
    setSaving(true);
    const { error } = await supabase.from('questionarios_respostas').insert({
      clinic_id: clinicId,
      child_id: pac.id,
      instrumento: instrKey,
      respondente,
      respostas,
      score_total: resultado.total,
      score_detalhe: resultado.detalhe,
      nivel_risco: resultado.nivel,
      interpretacao: resultado.interpretacao,
      observacoes: obs,
      data_avaliacao: dataAval,
    });
    setSaving(false);
    if (!error) {
      await loadHistorico();
      setFase('lista');
    }
  }

  const respostasCompletas = instr ? instr.questoes.every(q => respostas[q.id] !== undefined && respostas[q.id] !== '') : false;

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportTxt(ev.target?.result as string ?? '');
    reader.readAsText(file, 'UTF-8');
  }

  async function processarImport() {
    setImportErr('');
    try {
      const parsed = JSON.parse(importTxt);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      if (!pac || !clinicId) throw new Error('Selecione um paciente primeiro.');
      for (const entry of entries) {
        if (!entry.instrumento || !INSTRUMENTOS[entry.instrumento]) throw new Error(`Instrumento desconhecido: "${entry.instrumento}"`);
        const calc = INSTRUMENTOS[entry.instrumento].calcular(entry.respostas ?? {});
        await supabase.from('questionarios_respostas').insert({
          clinic_id: clinicId,
          child_id: pac.id,
          instrumento: entry.instrumento,
          respondente: entry.respondente ?? '',
          respostas: entry.respostas ?? {},
          score_total: calc.total,
          score_detalhe: calc.detalhe,
          nivel_risco: calc.nivel,
          interpretacao: calc.interpretacao,
          observacoes: entry.observacoes ?? '',
          data_avaliacao: entry.data_avaliacao ?? new Date().toISOString().slice(0, 10),
        });
      }
      await loadHistorico();
      setFase('lista');
      setImportTxt('');
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Arquivo inválido');
    }
  }

  function exportarJSON(item: QuestionarioResposta) {
    const data = { instrumento: item.instrumento, data_avaliacao: item.data_avaliacao, respondente: item.respondente, respostas: item.respostas, observacoes: item.observacoes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${item.instrumento}_${item.data_avaliacao}.json`; a.click();
  }

  async function deletarItem(id: number) {
    if (!confirm('Excluir esta avaliação?')) return;
    await supabase.from('questionarios_respostas').delete().eq('id', id);
    await loadHistorico();
  }

  const nivelCor: Record<string, string> = { baixo:'#22c55e', normal:'#22c55e', medio:'#f59e0b', atencao:'#f59e0b', alto:'#ef4444', clinico:'#ef4444', sugestivo:'#f59e0b' };
  const nivelLabel: Record<string, string> = { baixo:'Risco Baixo', normal:'Normal', medio:'Risco Médio', atencao:'Limítrofe', alto:'Risco Alto', clinico:'Clínico', sugestivo:'Sugestivo' };

  // ── RENDER ──────────────────────────────────────────────────

  if (data.children.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🧩</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>Nenhum Paciente Cadastrado</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>Cadastre pacientes na seção Pacientes para iniciar avaliações.</div>
    </div>
  );

  // ── SELEÇÃO DE INSTRUMENTO ───────────────────────────────────
  if (fase === 'selecionar') return (
    <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setFase('lista')} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>← Voltar</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Escolher Instrumento</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>{pac?.name}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {Object.values(INSTRUMENTOS).map(i => (
          <div key={i.id} onClick={() => iniciarQuestionario(i.id)} style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 14, padding: 20, cursor: 'pointer', transition: '.2s', borderLeft: `4px solid ${i.cor}` }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = i.cor)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bdr)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ background: i.cor + '22', color: i.cor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '.5px' }}>{i.sigla}</span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>{i.tempo} · {i.questoes.length} itens</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>{i.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.5 }}>{i.descricao}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--t3)' }}>
              <span>👶 {i.faixaEtaria}</span>
              <span>👤 {i.respondente}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── PREENCHIMENTO ────────────────────────────────────────────
  if (fase === 'preencher' && instr) {
    const categorias = Array.from(new Set(instr.questoes.map(q => q.categoria).filter(Boolean)));
    const hasCats = categorias.length > 1;
    return (
      <div style={{ padding: '20px 24px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setFase('selecionar')} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>← Voltar</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{instr.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{pac?.name} · {instr.respondente}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>{Object.keys(respostas).length}/{instr.questoes.length} respondidas</div>
        </div>

        {/* Metadados */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20, background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Data</div>
            <input type="date" value={dataAval} onChange={e => setDataAval(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--t1)', width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Respondente</div>
            <input value={respondente} onChange={e => setRespondente(e.target.value)} placeholder="Ex: mãe, pai, terapeuta" style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--t1)', width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Progresso</div>
            <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--bdr)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: instr.cor, borderRadius: 3, width: `${(Object.keys(respostas).length / instr.questoes.length) * 100}%`, transition: '.3s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: instr.cor }}>{Math.round((Object.keys(respostas).length / instr.questoes.length) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Instrução específica do instrumento */}
        {instrKey === 'M-CHAT-R' && <div style={{ background: '#3b82f622', border: '1px solid #3b82f655', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--t2)' }}>Responda com base no comportamento <strong>TÍPICO</strong> da criança nas últimas semanas. Não conte dias de doença ou situações atípicas.</div>}
        {instrKey === 'CARS' && <div style={{ background: '#7c3aed22', border: '1px solid #7c3aed55', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--t2)' }}>Avalie cada item com base na observação direta e informações dos pais. Use os valores intermediários (1,5 / 2,5 / 3,5) quando o comportamento estiver entre dois níveis.</div>}

        {/* Questões */}
        {(hasCats ? categorias : [undefined]).map(cat => (
          <div key={cat ?? 'all'} style={{ marginBottom: hasCats ? 20 : 0 }}>
            {hasCats && cat && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--bdr)' }}>{cat}</div>}
            {instr.questoes.filter(q => !hasCats || q.categoria === cat).map(q => (
              <div key={q.id} style={{ marginBottom: 14, background: respostas[q.id] !== undefined ? 'var(--sf2)' : 'var(--bg)', border: `1px solid ${respostas[q.id] !== undefined ? 'var(--bdr)' : 'var(--bdr)'}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <span style={{ background: instr.cor + '22', color: instr.cor, fontSize: 11, fontWeight: 700, minWidth: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{q.num}</span>
                  <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5, paddingTop: 4 }}>
                    {q.texto}
                    {q.categoria === 'crítico' && <span style={{ marginLeft: 6, background: '#ef444422', color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>CRÍTICO</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 38 }}>
                  {q.opcoes.map(op => (
                    <button key={String(op.valor)} onClick={() => setRespostas(prev => ({ ...prev, [q.id]: op.valor }))}
                      style={{ border: `2px solid ${String(respostas[q.id]) === String(op.valor) ? instr.cor : 'var(--bdr)'}`, background: String(respostas[q.id]) === String(op.valor) ? instr.cor + '22' : 'none', color: String(respostas[q.id]) === String(op.valor) ? instr.cor : 'var(--t2)', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: '.15s' }}>
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Observações + Calcular */}
        <div style={{ marginTop: 20, background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 8 }}>Observações clínicas</div>
          <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Contexto da avaliação, comportamentos observados, dificuldades durante a aplicação..." rows={3} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--t1)', resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={calcularResultado} disabled={!respostasCompletas}
            style={{ background: respostasCompletas ? instr.cor : 'var(--bdr)', color: respostasCompletas ? '#fff' : 'var(--t3)', border: 'none', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: respostasCompletas ? 'pointer' : 'not-allowed', transition: '.2s' }}>
            {respostasCompletas ? 'Calcular Resultado →' : `Faltam ${instr.questoes.length - Object.keys(respostas).length} respostas`}
          </button>
        </div>
      </div>
    );
  }

  // ── RESULTADO ────────────────────────────────────────────────
  if (fase === 'resultado' && resultado && instr) return (
    <div style={{ padding: '20px 24px', maxWidth: 740, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setFase('preencher')} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>← Revisar</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Resultado — {instr.sigla}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>{pac?.name}</div>
        </div>
      </div>

      {/* Score principal */}
      <div style={{ background: resultado.cor + '15', border: `2px solid ${resultado.cor}`, borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: resultado.cor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px' }}>{instrKey === 'CARS' ? resultado.total.toFixed(1) : resultado.total}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Score Total</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: resultado.cor }}>{resultado.label}</div>
      </div>

      {/* Subscores */}
      {Object.keys(resultado.detalhe).length > 0 && (
        <div style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>Detalhamento por Área</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {Object.entries(resultado.detalhe).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interpretação */}
      <div style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Interpretação</div>
        <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, margin: 0 }}>{resultado.interpretacao}</p>
      </div>

      {/* Recomendação */}
      <div style={{ background: resultado.cor + '15', border: `1px solid ${resultado.cor}55`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: resultado.cor, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Recomendação Clínica</div>
        <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.7, margin: 0 }}>{resultado.recomendacao}</p>
      </div>

      <div style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '8px 12px', marginBottom: 20, fontSize: 11, color: 'var(--t3)' }}>
        ⚠️ Este instrumento é uma ferramenta de triagem/avaliação e não substitui o diagnóstico clínico formal por profissional habilitado.
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button onClick={() => setFase('preencher')} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '10px 20px', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← Revisar Respostas</button>
        <button onClick={salvarResultado} disabled={saving} style={{ background: 'var(--p)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
          {saving ? 'Salvando...' : '✓ Salvar no Prontuário'}
        </button>
      </div>
    </div>
  );

  // ── IMPORTAR ─────────────────────────────────────────────────
  if (fase === 'importar') return (
    <div style={{ padding: '20px 24px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setFase('lista')} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>← Voltar</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Importar Avaliação</div>
      </div>

      <div style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>Formato JSON esperado</div>
        <pre style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 14, fontSize: 11, color: 'var(--t3)', overflow: 'auto', margin: 0 }}>{`{
  "instrumento": "M-CHAT-R",       // ou "CARS", "SDQ", "SNAP-IV"
  "data_avaliacao": "2026-07-25",
  "respondente": "mãe",
  "respostas": { "q1": "sim", "q2": "não", ... },
  "observacoes": "Texto opcional"
}`}</pre>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>Também aceita um array de objetos para importar múltiplas avaliações de uma vez.</div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          📂 Carregar Arquivo JSON
        </button>
        <span style={{ fontSize: 12, color: 'var(--t3)', alignSelf: 'center' }}>ou cole o JSON abaixo</span>
      </div>

      <textarea value={importTxt} onChange={e => setImportTxt(e.target.value)} placeholder='{ "instrumento": "M-CHAT-R", ... }' rows={10}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--t1)', fontFamily: 'monospace', resize: 'vertical', marginBottom: 8 }} />

      {importErr && <div style={{ background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#ef4444', marginBottom: 12 }}>❌ {importErr}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={processarImport} disabled={!importTxt.trim()} style={{ background: 'var(--p)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: importTxt.trim() ? 'pointer' : 'not-allowed', opacity: importTxt.trim() ? 1 : .5 }}>
          Importar →
        </button>
      </div>
    </div>
  );

  // ── VISUALIZAR ITEM HISTÓRICO ────────────────────────────────
  if (fase === 'visualizar' && viewItem) {
    const instrV = INSTRUMENTOS[viewItem.instrumento];
    const corV = nivelCor[viewItem.nivel_risco ?? 'normal'] ?? '#6b7280';
    return (
      <div style={{ padding: '20px 24px', maxWidth: 740, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => { setFase('lista'); setViewItem(null); }} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>← Voltar</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{instrV?.nome ?? viewItem.instrumento}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{pac?.name} · {viewItem.data_avaliacao} · Respondente: {viewItem.respondente || '—'}</div>
          </div>
          <button onClick={() => exportarJSON(viewItem)} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>⬇ Exportar</button>
        </div>

        <div style={{ background: corV + '15', border: `2px solid ${corV}`, borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: corV }}>{viewItem.score_total?.toFixed ? viewItem.score_total.toFixed(viewItem.instrumento === 'CARS' ? 1 : 0) : viewItem.score_total}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Score Total</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: corV }}>{nivelLabel[viewItem.nivel_risco ?? 'normal'] ?? viewItem.nivel_risco}</div>
        </div>

        {viewItem.score_detalhe && Object.keys(viewItem.score_detalhe).length > 0 && (
          <div style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 10 }}>Detalhamento</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
              {Object.entries(viewItem.score_detalhe).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{typeof v === 'number' && !Number.isInteger(v) ? (v as number).toFixed(2) : v}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'capitalize' }}>{k.replace(/_/g,' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewItem.interpretacao && (
          <div style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Interpretação</div>
            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, margin: 0 }}>{viewItem.interpretacao}</p>
          </div>
        )}

        {viewItem.observacoes && (
          <div style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Observações</div>
            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, margin: 0 }}>{viewItem.observacoes}</p>
          </div>
        )}
      </div>
    );
  }

  // ── LISTA ────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>Questionários Diagnósticos</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>
            {pac ? `${pac.name} · ${historico.length} avaliação${historico.length !== 1 ? 'ões' : ''} registrada${historico.length !== 1 ? 's' : ''}` : 'Selecione um paciente'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedChildId ?? ''}
            onChange={e => setSelectedChildId(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 8, background: 'var(--sf)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit' }}
          >
            {data.children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setFase('importar')} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⬆ Importar
          </button>
          <button onClick={() => pac && setFase('selecionar')} disabled={!pac} style={{ background: pac ? 'var(--p)' : 'var(--bdr)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: pac ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
            + Nova Avaliação
          </button>
        </div>
      </div>

      {/* Cards de instrumentos disponíveis */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.values(INSTRUMENTOS).map(i => (
          <div key={i.id} onClick={() => iniciarQuestionario(i.id)} style={{ background: 'var(--sf2)', border: `1px solid ${i.cor}44`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: '.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = i.cor)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = i.cor + '44')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: i.cor }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>{i.sigla}</span>
          </div>
        ))}
      </div>

      {/* Histórico */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Carregando...</div>
      ) : historico.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'var(--sf2)', borderRadius: 14, border: '1px dashed var(--bdr)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>Nenhuma avaliação registrada</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>Aplique M-CHAT-R, CARS, SDQ ou SNAP-IV para {pac?.name ?? 'o paciente selecionado'}.</div>
          <button onClick={() => setFase('selecionar')} style={{ background: 'var(--p)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Iniciar Primeira Avaliação</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {historico.map(h => {
            const instrH = INSTRUMENTOS[h.instrumento];
            const cor = nivelCor[h.nivel_risco ?? 'normal'] ?? '#6b7280';
            return (
              <div key={h.id} style={{ background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 4, height: 48, borderRadius: 2, background: instrH?.cor ?? '#6b7280', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{instrH?.nome ?? h.instrumento}</span>
                    <span style={{ background: cor + '20', color: cor, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{nivelLabel[h.nivel_risco ?? ''] ?? h.nivel_risco ?? '—'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                    {h.data_avaliacao} · Score: <strong style={{ color: 'var(--t1)' }}>{h.score_total}</strong>
                    {h.respondente ? ` · ${h.respondente}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setViewItem(h); setFase('visualizar'); }} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Ver</button>
                  <button onClick={() => exportarJSON(h)} style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t2)', padding: '5px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>⬇</button>
                  <button onClick={() => deletarItem(h.id)} style={{ background: 'none', border: '1px solid var(--bdr)', color: '#ef4444', padding: '5px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
