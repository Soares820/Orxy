import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Termos de Uso' };

export default function TermosPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)', fontFamily: 'var(--font)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--p)', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 32 }}>
          ← Voltar
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--t1)', marginBottom: 8 }}>Termos de Uso</h1>
        <p style={{ fontSize: 14, color: 'var(--t3)', marginBottom: 40 }}>Última atualização: 14 de julho de 2026</p>

        {[
          {
            title: '1. Aceitação dos termos',
            text: 'Ao criar uma conta ou usar a ORYX, você concorda com estes Termos de Uso e nossa Política de Privacidade. Se não concordar, não utilize o serviço.',
          },
          {
            title: '2. Descrição do serviço',
            text: 'A ORYX é um software de gestão clínica destinado exclusivamente a profissionais de saúde e clínicas que atendem pessoas com Transtorno do Espectro Autista (TEA). O serviço inclui módulos de agenda, gestão de pacientes, PEI, financeiro, BI e assistente de IA (Reavix).',
          },
          {
            title: '3. Responsabilidades do usuário',
            text: 'Você é responsável por: (a) manter a confidencialidade de suas credenciais de acesso; (b) garantir que todas as informações inseridas na plataforma são precisas e obtidas com o consentimento adequado; (c) usar o serviço em conformidade com as leis e regulamentos aplicáveis, incluindo normas de sigilo profissional; (d) não compartilhar acesso com pessoas não autorizadas.',
          },
          {
            title: '4. Uso do Reavix AI',
            text: 'A ferramenta Reavix AI utiliza inteligência artificial para auxiliar profissionais de saúde. As respostas geradas são de natureza informativa e não substituem o julgamento clínico profissional. O usuário é inteiramente responsável pelas decisões clínicas tomadas. A ORYX não se responsabiliza por diagnósticos, tratamentos ou intervenções baseados no conteúdo gerado pela IA.',
          },
          {
            title: '5. Planos e pagamentos',
            text: 'O serviço oferece um período de trial de 14 dias gratuito. Após o período de trial, é necessária a contratação de um plano pago. Os valores são cobrados mensalmente por cartão de crédito. O cancelamento pode ser feito a qualquer momento, com acesso mantido até o final do período pago.',
          },
          {
            title: '6. Propriedade intelectual',
            text: 'Todo o conteúdo, código e tecnologia da ORYX são protegidos por direitos autorais e pertencem exclusivamente à ORYX. Os dados inseridos pelos usuários pertencem aos próprios usuários. A ORYX não reivindica propriedade sobre dados de pacientes ou conteúdo clínico criado pelos profissionais.',
          },
          {
            title: '7. Limitação de responsabilidade',
            text: 'A ORYX é fornecida "como está". Não garantimos disponibilidade ininterrupta do serviço. Nossa responsabilidade está limitada ao valor pago pelo serviço nos 3 meses anteriores ao evento causador do dano. Não nos responsabilizamos por danos indiretos ou consequenciais.',
          },
          {
            title: '8. Rescisão',
            text: 'Podemos suspender ou encerrar sua conta por violação destes termos, mediante aviso prévio de 48 horas, exceto em casos de violação grave. Você pode cancelar sua conta a qualquer momento nas configurações da plataforma.',
          },
          {
            title: '9. Legislação aplicável',
            text: 'Estes termos são regidos pelas leis brasileiras, incluindo o Código de Defesa do Consumidor, a LGPD e o Marco Civil da Internet. O foro competente é o da comarca de São Paulo/SP.',
          },
          {
            title: '10. Contato',
            text: 'Para dúvidas sobre estes termos: suporte@oryxsoftware.com.br',
          },
        ].map((s) => (
          <section key={s.title} style={{ marginBottom: 32 }}>
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
