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

const STATS = [
  { n: '+1.800', l: 'Famílias atendidas' },
  { n: '+420',   l: 'Clínicas parceiras' },
  { n: '+28.000', l: 'Avaliações realizadas' },
  { n: '4.9★',  l: 'Avaliação média' },
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

        {/* Stats */}
        <div className="lp-stats-wrap">
          <div className="lp-stats">
            {STATS.map((s) => (
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
