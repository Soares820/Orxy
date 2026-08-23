import type { Metadata } from 'next';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFooter from '@/components/landing/LandingFooter';
import './landing.css';

export const metadata: Metadata = {
  title: 'ORYX — Software para Terapia ABA',
};

const DIFERENCIAIS = [
  { n: '3 escalas',  l: 'Avaliações validadas' },
  { n: 'Tempo real', l: 'BI e evolução clínica' },
  { n: '24/7',       l: 'Chat família-clínica' },
  { n: 'LGPD',       l: 'Dados criptografados' },
];

export default function HomePage() {
  return (
    <div id="landing" style={{ background: '#040b18', minHeight: '100vh', color: '#fff' }}>
      {/* Blobs decorativos */}
      <div className="lp-blob lp-b1" />
      <div className="lp-blob lp-b2" />
      <div className="lp-blob lp-b3" />

      {/* Navegação */}
      <LandingNav />

      {/* Conteúdo */}
      <div className="lp-content">
        {/* Hero */}
        <LandingHero />

        {/* Diferenciais */}
        <div className="lp-stats-wrap">
          <div className="lp-stats">
            {DIFERENCIAIS.map((s) => (
              <div key={s.l}>
                <div className="lp-stat-n">{s.n}</div>
                <div className="lp-stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <LandingFeatures />

        {/* Pricing */}
        <LandingPricing />
      </div>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
