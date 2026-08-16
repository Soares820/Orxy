'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="lp-foot">
      <div className="lp-foot-in">
        <div className="lp-foot-brand">
          <div className="lp-foot-logo">
            <div className="lp-logo-mark" style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden' }}>
              <Image src="/logo.png" alt="ORYX" width={36} height={36} style={{ objectFit: 'contain' }} />
            </div>
            <span className="lp-foot-txt">ORYX</span>
          </div>
          <p className="lp-foot-desc">
            Software de gestão clínica especializado em TEA e Terapia Ocupacional. Desenvolvido no Brasil para clínicas brasileiras.
          </p>
        </div>

        <div className="lp-foot-links">
          <div>
            <div className="lp-foot-ttl">Produto</div>
            <a onClick={() => document.getElementById('lp-features')?.scrollIntoView({ behavior: 'smooth' })}>Recursos</a>
            <a onClick={() => document.getElementById('lp-pricing')?.scrollIntoView({ behavior: 'smooth' })}>Preços</a>
            <Link href="/blog">Blog</Link>
            <Link href="/wiki">Manual</Link>
          </div>
          <div>
            <div className="lp-foot-ttl">Empresa</div>
            <a href="#sobre">Sobre nós</a>
            <a href="mailto:contato@toplataforma.com.br">Contato</a>
            <a href="https://wa.me/5511999999999" target="_blank" rel="noopener">WhatsApp</a>
          </div>
          <div>
            <div className="lp-foot-ttl">Legal</div>
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/privacidade">Privacidade</Link>
            <a href="#lgpd">LGPD</a>
          </div>
        </div>
      </div>

      <div className="lp-foot-bot">
        <span>© {new Date().getFullYear()} ORYX. Todos os direitos reservados.</span>
        <span className="lp-foot-cert">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Dados protegidos · LGPD compliant
        </span>
      </div>
    </footer>
  );
}
