'use client';

import { useRouter } from 'next/navigation';

const CHECK = (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CROSS = (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PLANS = [
  {
    name: 'Starter', nameColor: 'rgba(255,255,255,.4)',
    desc: 'Para clínicas que estão começando',
    cta: 'Criar conta grátis', ctaClass: 'lp-cta-out',
    popular: false,
    features: [
      { ok: true,  text: 'Até 5 pacientes' },
      { ok: true,  text: 'Avaliações PEDI/PS/SPM' },
      { ok: true,  text: 'Registro de atividades' },
      { ok: true,  text: 'Central de crises' },
      { ok: true,  text: 'Dashboard familiar incluso' },
      { ok: false, text: 'PEI e folha de registro' },
      { ok: false, text: 'BI avançado' },
      { ok: false, text: 'Multi-terapeuta' },
    ],
  },
  {
    name: 'Clínica Pro', nameColor: '#60A5FA',
    desc: 'Para clínicas em crescimento que precisam de gestão completa',
    cta: 'Falar com consultor →', ctaClass: 'lp-cta-prim',
    popular: true,
    features: [
      { ok: true, text: 'Até 30 pacientes', bold: true },
      { ok: true, text: 'PEI + Folha de registro DTT/NET' },
      { ok: true, text: 'BI clínico avançado + radar' },
      { ok: true, text: 'Sala de espera virtual' },
      { ok: true, text: 'Multi-terapeuta (até 10)' },
      { ok: true, text: 'Agenda inteligente' },
      { ok: true, text: 'Relatórios PDF' },
      { ok: true, text: 'Notificações de crise 24h' },
    ],
  },
  {
    name: 'Enterprise', nameColor: '#A78BFA',
    desc: 'Para redes e grandes clínicas com múltiplas unidades',
    cta: 'Começar 14 dias grátis', ctaClass: 'lp-cta-out',
    popular: false,
    features: [
      { ok: true, text: 'Pacientes ilimitados', bold: true },
      { ok: true, text: 'Tudo do Pro +' },
      { ok: true, text: 'Multi-profissional ilimitado' },
      { ok: true, text: 'White-label com logo da clínica' },
      { ok: true, text: 'Integração com convênios' },
      { ok: true, text: 'Onboarding dedicado' },
      { ok: true, text: 'SLA 99.9%' },
      { ok: true, text: 'API de integração' },
    ],
  },
];

export default function LandingPricing() {
  const router = useRouter();

  function handleCta(plan: typeof PLANS[0]) {
    if (plan.name === 'Clínica Pro') {
      window.open('https://wa.me/5541999177922?text=Olá!%20Quero%20conhecer%20o%20plano%20Clínica%20Pro%20da%20ORYX', '_blank');
    } else {
      router.push('/register');
    }
  }

  return (
    <section className="lp-sec" id="lp-pricing">
      <div className="lp-sec-in">
        <div className="lp-sec-chip">Planos</div>
        <h2 className="lp-sec-h">Escolha o plano ideal<br />para sua clínica</h2>
        <p className="lp-sec-sub">
          Converse com um de nossos consultores e descubra qual plano atende melhor sua clínica.
        </p>

        <div className="lp-price-grid">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`lp-plan${plan.popular ? ' pop' : ''}`}>
              {plan.popular && <div className="lp-pop-tag">Mais popular</div>}
              <div className="lp-plan-name" style={{ color: plan.nameColor }}>{plan.name}</div>
              <div className="lp-plan-desc">{plan.desc}</div>
              <button
                className={`lp-plan-cta ${plan.ctaClass}`}
                onClick={() => handleCta(plan)}
              >
                {plan.cta}
              </button>
              <div className="lp-plan-div" />
              <div className="lp-fl">
                {plan.features.map((f) => (
                  <div key={f.text} className={`lp-fi${f.ok ? '' : ' off'}`}>
                    <span className={`lp-fck ${f.ok ? 'y' : 'n'}`}>
                      {f.ok ? CHECK : CROSS}
                    </span>
                    {f.bold ? <strong>{f.text}</strong> : f.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.28)', fontWeight: 500 }}>
            Tem dúvidas sobre qual plano escolher?{' '}
          </span>
          <button
            style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => window.open('https://wa.me/5541999177922', '_blank')}
          >
            Falar com consultor →
          </button>
        </div>
      </div>
    </section>
  );
}
