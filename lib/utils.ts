// Utilitários gerais do sistema

export function formatCurrency(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '';
  // Datas "puras" (colunas DATE do Postgres, ex: sessoes.data) não têm fuso —
  // new Date('YYYY-MM-DD') interpreta como UTC meia-noite, e toLocaleDateString
  // converte pro fuso local, voltando um dia em qualquer timezone negativo
  // (ex: Brasil). Nesse caso construímos a data com os componentes locais.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(iso);
  return d.toLocaleDateString('pt-BR', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatAge(dob: string | null | undefined): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 24) return `${totalMonths} meses`;
  return `${Math.floor(totalMonths / 12)} anos`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export const MONTH_NAMES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Converte um Date pro fuso LOCAL como YYYY-MM-DD. NUNCA usar d.toISOString()
// pra isso quando `d` carrega um horário real (não meia-noite) — toISOString()
// converte pra UTC, e o Brasil (UTC-3/-5) já vira o dia seguinte em UTC a
// partir do fim da tarde/noite local, fazendo qualquer tela que dependa de
// "hoje" (ou de uma data derivada de "agora") mostrar o dia errado à noite.
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "Hoje" no fuso local, como YYYY-MM-DD. Ver toLocalISODate().
export function todayLocalISO(): string {
  return toLocalISODate(new Date());
}

// "Mês atual" no fuso local, como YYYY-MM. Mesmo motivo de todayLocalISO().
export function currentMonthLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Returns array of 'YYYY-MM' strings for the last N months (oldest first)
export function getLastNMonths(n: number): string[] {
  const now = new Date();
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}
