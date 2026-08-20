// Utilitário de Export/Import Excel e CSV
// Usado em PacientesScreen, FinanceiroScreen e AvaliacoesScreen

import * as XLSX from 'xlsx';

// ─── EXPORT ──────────────────────────────────────────────────

export function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── IMPORT ──────────────────────────────────────────────────

export async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ─── MAPEADORES ──────────────────────────────────────────────

/** Normaliza uma chave de coluna (remove acentos, espaços, caixa) */
function norm(s: unknown): string {
  return String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_').trim();
}

function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    for (const col of Object.keys(row)) {
      if (norm(col) === norm(k) && row[col] !== '' && row[col] != null) {
        return String(row[col]);
      }
    }
  }
  return '';
}

function pickNum(row: Record<string, unknown>, ...keys: string[]): number {
  const v = pick(row, ...keys);
  const n = parseFloat(v.replace(',', '.').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function pickDate(row: Record<string, unknown>, ...keys: string[]): string {
  const v = pick(row, ...keys);
  if (!v) return '';
  // Se vier como Date do xlsx
  if (v.match(/^\d{4}-\d{2}-\d{2}/)) return v.slice(0, 10);
  // dd/mm/aaaa
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return v.slice(0, 10);
}

// ── Pacientes ────────────────────────────────────────────────

export interface PacienteImport {
  name: string;
  dob: string;
  sex: string;
  diagnosis: string;
  responsible: string;
  pai_nome: string;
  mae_nome: string;
  email_responsavel: string;
  therapist: string;
  notes: string;
}

export function mapPaciente(row: Record<string, unknown>): PacienteImport {
  return {
    name:              pick(row, 'nome', 'name', 'paciente', 'nome_paciente'),
    dob:               pickDate(row, 'nascimento', 'data_nascimento', 'dob', 'data_nasc'),
    sex:               pick(row, 'sexo', 'genero', 'sex', 'gender').charAt(0).toUpperCase(),
    diagnosis:         pick(row, 'diagnostico', 'diagnosis', 'cid', 'condicao'),
    responsible:       pick(row, 'responsavel', 'responsible', 'responsavel_legal'),
    pai_nome:          pick(row, 'pai', 'nome_pai', 'pai_nome'),
    mae_nome:          pick(row, 'mae', 'nome_mae', 'mae_nome'),
    email_responsavel: pick(row, 'email', 'email_responsavel', 'email_familia'),
    therapist:         pick(row, 'terapeuta', 'therapist', 'profissional'),
    notes:             pick(row, 'observacoes', 'notas', 'notes', 'obs'),
  };
}

// ── Pagamentos (contas a receber) ────────────────────────────

export interface PagamentoImport {
  child_name: string;
  mes: string;
  valor_previsto: number;
  valor_recebido: number;
  status: string;
  data_pag: string;
}

export function mapPagamento(row: Record<string, unknown>): PagamentoImport {
  const statusRaw = pick(row, 'status', 'situacao').toLowerCase();
  let status = 'pendente';
  if (statusRaw.includes('receb') || statusRaw.includes('pago')) status = 'recebido';
  else if (statusRaw.includes('parcial')) status = 'parcial';
  else if (statusRaw.includes('inadim') || statusRaw.includes('atraso')) status = 'inadimplente';

  const mesRaw = pick(row, 'mes', 'competencia', 'mes_referencia', 'periodo');
  let mes = mesRaw;
  if (mesRaw && !mesRaw.match(/^\d{4}-\d{2}/)) {
    const d = pickDate(row, 'mes', 'competencia', 'data', 'vencimento');
    mes = d ? d.slice(0, 7) : new Date().toISOString().slice(0, 7);
  }

  return {
    child_name:     pick(row, 'paciente', 'nome_paciente', 'cliente', 'nome'),
    mes:            mes || new Date().toISOString().slice(0, 7),
    valor_previsto: pickNum(row, 'valor', 'valor_previsto', 'mensalidade', 'valor_total'),
    valor_recebido: pickNum(row, 'valor_recebido', 'valor_pago', 'recebido'),
    status,
    data_pag:       pickDate(row, 'data_pagamento', 'data_pag', 'data_recebimento'),
  };
}

// ── Despesas (contas a pagar) ─────────────────────────────────

export interface DespesaImport {
  descricao: string;
  categoria: string;
  valor: number;
  mes: string;
  data: string;
  status: string;
  fornecedor: string;
  notas: string;
}

const CAT_MAP: Record<string, string> = {
  salario: 'folha', salarios: 'folha', 'pro-labore': 'folha', prolabore: 'folha',
  supervisao: 'supervisao', supervision: 'supervisao',
  aluguel: 'aluguel', rent: 'aluguel', iptu: 'aluguel',
  material: 'material', materiais: 'material', suprimentos: 'material',
  equipamento: 'equipamentos', equipamentos: 'equipamentos',
  marketing: 'marketing', publicidade: 'marketing',
  curso: 'formacao', formacao: 'formacao', treinamento: 'formacao',
  contabilidade: 'adm', juridico: 'adm', seguro: 'adm', adm: 'adm',
  software: 'ti', internet: 'ti', telefone: 'ti', ti: 'ti',
};

export function mapDespesa(row: Record<string, unknown>): DespesaImport {
  const catRaw = norm(pick(row, 'categoria', 'tipo', 'tipo_despesa', 'natureza'));
  const categoria = CAT_MAP[catRaw] ?? 'outros';
  const statusRaw = norm(pick(row, 'status', 'situacao'));
  const status = statusRaw.includes('pend') ? 'pendente' : 'pago';

  const mesRaw = pick(row, 'mes', 'competencia', 'periodo', 'mes_referencia');
  const dataRaw = pickDate(row, 'data', 'data_vencimento', 'vencimento', 'data_pagamento');
  let mes = mesRaw;
  if (!mes?.match(/^\d{4}-\d{2}/)) {
    mes = dataRaw ? dataRaw.slice(0, 7) : new Date().toISOString().slice(0, 7);
  }

  return {
    descricao:  pick(row, 'descricao', 'historico', 'nome', 'description', 'item'),
    categoria,
    valor:      pickNum(row, 'valor', 'value', 'montante', 'total'),
    mes,
    data:       dataRaw,
    status,
    fornecedor: pick(row, 'fornecedor', 'empresa', 'prestador', 'vendor'),
    notas:      pick(row, 'notas', 'observacoes', 'obs', 'notes'),
  };
}

// ── Avaliações ────────────────────────────────────────────────

export interface AvaliacaoImport {
  child_name: string;
  tipo: string;
  data: string;
  notas: string;
  scores: Record<string, unknown>;
}

export function mapAvaliacao(row: Record<string, unknown>): AvaliacaoImport {
  // Campos que não são scores
  const knownKeys = new Set(['paciente','nome','nome_paciente','child_name','tipo','instrumento',
    'data','data_avaliacao','notas','observacoes','obs','notes','terapeuta','avaliador']);
  const scores: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!knownKeys.has(norm(k)) && v !== '' && v != null) {
      scores[k] = v;
    }
  }
  return {
    child_name: pick(row, 'paciente', 'nome', 'nome_paciente', 'child_name'),
    tipo:       pick(row, 'tipo', 'instrumento', 'avaliacao', 'escala') || 'Personalizado',
    data:       pickDate(row, 'data', 'data_avaliacao', 'date'),
    notas:      pick(row, 'notas', 'observacoes', 'obs', 'notes', 'interpretacao'),
    scores,
  };
}
