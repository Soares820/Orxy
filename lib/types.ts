// ═══════════════════════════════════════════════════════════
// T.O Plataforma — Tipos TypeScript alinhados ao schema.sql
// ═══════════════════════════════════════════════════════════

// ─── Tabelas do banco ─────────────────────────────────────

export interface Clinica {
  id: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  plano: 'trial' | 'basico' | 'pro' | 'enterprise';
  status: 'trial' | 'ativo' | 'suspenso' | 'cancelado';
  trial_ends: string | null;
  created_at: string;
}

export interface Usuario {
  id: string;
  auth_id: string;
  clinic_id: string;
  nome: string;
  email: string;
  role: 'admin' | 'terapeuta' | 'recepcao' | 'financeiro' | 'familia';
  cargo?: string | null;
  telefone?: string | null;
  status: 'ativo' | 'inativo';
  created_at: string;
  paciente_id?: number | null;
}

export interface Paciente {
  id: number;
  clinic_id: string;
  name: string;
  codigo?: string | null;
  dob?: string | null;
  sex?: string | null;
  responsible?: string | null;
  pai_nome?: string | null;
  mae_nome?: string | null;
  email_responsavel?: string | null;
  diagnosis?: string | null;
  therapist?: string | null;
  notes?: string | null;
  status: 'ativo' | 'inativo' | 'alta';
  created_at?: string;
}

export interface Sessao {
  id: number;
  clinic_id: string;
  child_id: number;
  funcionario_id?: number | null;
  data: string;          // DATE (YYYY-MM-DD)
  hora: string;          // HH:MM
  tipo: string;          // ABA | TO | Fonoaudiologia | Psicologia | Outro
  status: 'agendado' | 'realizado' | 'cancelado' | 'falta';
  duracao_min?: number | null;
  notas?: string | null;
  paciente_nome?: string | null;
  created_at?: string;
}

export interface Contrato {
  id: number;
  clinic_id: string;
  child_id: number;
  tipo?: string | null;        // particular | convenio
  convenio?: string | null;
  valor_sessao?: number | null;
  sessoes_semanais?: number | null;
  duracao_min?: number | null;
  dia_vencimento?: number | null;
  status: 'ativo' | 'encerrado' | 'pausado';
  created_at?: string;
}

export interface Pagamento {
  id: number;
  clinic_id: string;
  child_id: number;
  contrato_id?: number | null;
  mes: string;               // YYYY-MM
  valor_previsto: number;
  valor_recebido: number;
  status: 'pendente' | 'recebido' | 'parcial' | 'inadimplente';
  data_pag?: string | null;
  created_at?: string;
}

export interface Funcionario {
  id: number;
  clinic_id: string;
  auth_id?: string | null;
  nome: string;
  email: string;
  cargo?: string | null;
  nivel: 'admin' | 'terapeuta' | 'recepcao' | 'financeiro';
  status: 'ativo' | 'inativo';
  telefone?: string | null;
  created_at?: string;
}

export interface Meta {
  id: number;
  clinic_id: string;
  child_id?: number | null;
  nome?: string | null;
  descricao: string;
  area?: string | null;
  status: 'ativo' | 'atingido' | 'pausado';
  criterio?: string | null;
  tipo_registro?: 'meta' | 'atividade';
  created_at?: string;
}

export interface Avaliacao {
  id: number;
  clinic_id: string;
  child_id: number;
  tipo: 'PEDI' | 'PS' | 'SPM' | 'ABLLS' | 'VBMAPP' | 'CARS' | 'Vineland' | 'Personalizado' | 'Outro';
  data: string;
  scores: Record<string, unknown>;
  notas?: string | null;
  created_at?: string;
}

export interface Despesa {
  id: number;
  clinic_id: string;
  descricao: string;
  categoria: 'folha' | 'supervisao' | 'aluguel' | 'material' | 'equipamentos' | 'marketing' | 'formacao' | 'adm' | 'ti' | 'outros';
  valor: number;
  mes: string;
  data?: string | null;
  status: 'pago' | 'pendente';
  recorrente: boolean;
  fornecedor_id?: number | null;
  notas?: string | null;
  created_at?: string;
}

export interface Fornecedor {
  id: number;
  clinic_id: string;
  nome: string;
  cnpj?: string | null;
  cpf?: string | null;
  categoria: 'energia' | 'agua' | 'telefone' | 'internet' | 'aluguel' | 'material' | 'contabilidade' | 'juridico' | 'manutencao' | 'equipamentos' | 'software' | 'folha' | 'outros';
  email?: string | null;
  telefone?: string | null;
  contato?: string | null;
  endereco?: string | null;
  notas?: string | null;
  status: 'ativo' | 'inativo';
  created_at?: string;
}

export interface BlogPost {
  id: number;
  titulo: string;
  resumo: string;
  conteudo?: string | null;
  fonte?: string | null;
  fonte_url?: string | null;
  categoria: string;
  tags: string[];
  publicado_em: string;
  criado_em: string;
}

// ─── Estados da UI ────────────────────────────────────────

export type Screen =
  | 'dashboard'
  | 'pacientes'
  | 'pei'
  | 'agenda'
  | 'financeiro'
  | 'bi'
  | 'equipe'
  | 'avaliacoes'
  | 'questionarios'
  | 'fornecedores'
  | 'reavix'
  | 'portal'
  | 'conta';

export interface QuestionarioResposta {
  id: number;
  clinic_id: string; // UUID
  child_id: number;
  instrumento: string;
  respondente: string;
  respostas: Record<string, string | number>;
  score_total: number | null;
  score_detalhe: Record<string, number>;
  nivel_risco: string | null;
  interpretacao: string | null;
  observacoes: string;
  data_avaliacao: string;
  criado_em: string;
}

export type ToastType = 'check' | 'error' | 'info' | 'warn';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// ─── Contexto da aplicação ────────────────────────────────

export interface AppData {
  children: Paciente[];
  sessions: Sessao[];
  contracts: Contrato[];
  payments: Pagamento[];
  goals: Meta[];
  evaluations: Avaliacao[];
  team: Funcionario[];
  profiles: Usuario[];
  expenses: Despesa[];
  fornecedores: Fornecedor[];
}

export interface AppUser {
  id: string;
  auth_id: string;
  email: string;
  clinicId: string;
  clinicName: string;
  role: Usuario['role'];
  name: string;
  plan: Clinica['plano'];
  trialEndsAt: string | null;
}
