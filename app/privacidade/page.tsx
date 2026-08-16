import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Política de Privacidade | ORYX' };

const SECTIONS = [
  {
    id: undefined,
    title: '1. Informações que coletamos',
    text: 'Coletamos informações fornecidas diretamente por você ao criar uma conta, incluindo nome, e-mail, dados da clínica e informações sobre pacientes inseridas na plataforma. Também coletamos automaticamente dados de uso e acesso para melhorar nossos serviços.',
  },
  {
    id: undefined,
    title: '2. Como usamos suas informações',
    text: 'Utilizamos as informações coletadas para fornecer, manter e melhorar nossos serviços, processar transações, enviar comunicações relacionadas ao serviço e cumprir obrigações legais. Nunca vendemos seus dados pessoais a terceiros.',
  },
  {
    id: undefined,
    title: '3. Proteção de dados clínicos',
    text: 'Dados de pacientes são tratados com máxima confidencialidade, em conformidade com a LGPD (Lei Geral de Proteção de Dados — Lei 13.709/2018) e as normas do Conselho Federal de Fonoaudiologia, CFM e CRF. O acesso é restrito apenas aos profissionais da clínica com credenciais válidas.',
  },
  {
    id: undefined,
    title: '4. Compartilhamento de informações',
    text: 'Não compartilhamos suas informações pessoais com terceiros, exceto: (a) com prestadores de serviços que nos auxiliam na operação da plataforma; (b) quando exigido por lei; (c) para proteger direitos, propriedade ou segurança da ORYX e seus usuários.',
  },
  {
    id: undefined,
    title: '5. Segurança',
    text: 'Implementamos medidas técnicas e organizacionais adequadas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia TLS/HTTPS em todas as comunicações e banco de dados com Row Level Security (RLS) habilitado.',
  },
  {
    id: 'lgpd',
    title: '6. Seus direitos (LGPD)',
    text: 'Nos termos da LGPD, você tem direito a: acessar seus dados, corrigir dados incorretos, solicitar exclusão, portabilidade dos dados, e revogar consentimento. Para exercer esses direitos, entre em contato pelo e-mail privacidade@oryxsoftware.com.br.',
  },
  {
    id: undefined,
    title: '7. Retenção de dados',
    text: 'Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, os dados são mantidos por 30 dias para possível reativação e, após esse período, excluídos permanentemente, exceto onde a lei exija retenção por período maior.',
  },
  {
    id: undefined,
    title: '8. Contato',
    text: 'Para questões sobre privacidade, entre em contato: privacidade@oryxsoftware.com.br',
  },
];

export default function PrivacidadePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)', fontFamily: 'var(--font-sans, Inter, sans-serif)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--p)', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 32 }}>
          ← Voltar
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--t1)', marginBottom: 8 }}>Política de Privacidade</h1>
        <p style={{ fontSize: 14, color: 'var(--t3)', marginBottom: 40 }}>Última atualização: 14 de julho de 2026 · ORYX Software</p>

        {SECTIONS.map((s) => (
          <section key={s.title} id={s.id} style={{ marginBottom: 32, scrollMarginTop: 80 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', marginBottom: 10 }}>{s.title}</h2>
            <p style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.75, margin: 0 }}>{s.text}</p>
          </section>
        ))}

        <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 24, marginTop: 40, textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--p)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Voltar para o início</Link>
        </div>
      </div>
    </div>
  );
}
