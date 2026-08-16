'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LandingNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function scrollTo(id: string) {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <nav className="lp-nav">
        <button className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="lp-logo-mark">
            <Image src="/logo.png" alt="ORYX" width={44} height={44} style={{ objectFit: 'contain', borderRadius: 8 }} />
          </div>
          <div>
            <div className="lp-logo-name">ORYX</div>
            <div className="lp-logo-tag">Software para TEA · ABA</div>
          </div>
        </button>

        <div className="lp-navlinks">
          <button className="lp-navlink" onClick={() => scrollTo('lp-features')}>Recursos</button>
          <button className="lp-navlink" onClick={() => scrollTo('lp-pricing')}>Preços</button>
          <button className="lp-navlink" onClick={() => router.push('/blog')}>Blog</button>
          <button className="lp-navlink" onClick={() => router.push('/wiki')}>Wiki</button>
        </div>

        <div className="lp-nav-ctas">
          <button className="lp-nav-login" onClick={() => router.push('/login')}>Entrar</button>
          <button className="lp-nav-cta lp-nav-cta-desk" onClick={() => router.push('/register')}>Começar grátis</button>
          <button
            className="lp-ham"
            onClick={() => setOpen(v => !v)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className={`lp-ham-line ${open ? 'lp-ham-open' : ''}`} />
            <span className={`lp-ham-line ${open ? 'lp-ham-open' : ''}`} />
            <span className={`lp-ham-line ${open ? 'lp-ham-open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="lp-mob-nav" onClick={() => setOpen(false)}>
          <div className="lp-mob-inner" onClick={e => e.stopPropagation()}>
            <button className="lp-mob-link" onClick={() => scrollTo('lp-features')}>Recursos</button>
            <button className="lp-mob-link" onClick={() => scrollTo('lp-pricing')}>Preços</button>
            <button className="lp-mob-link" onClick={() => { setOpen(false); router.push('/blog'); }}>Blog</button>
            <button className="lp-mob-link" onClick={() => { setOpen(false); router.push('/wiki'); }}>Wiki</button>
            <div className="lp-mob-divider" />
            <button className="lp-mob-cta" onClick={() => { setOpen(false); router.push('/login'); }}>Entrar</button>
            <button className="lp-mob-cta lp-mob-cta-p" onClick={() => { setOpen(false); router.push('/register'); }}>Começar grátis</button>
          </div>
        </div>
      )}
    </>
  );
}
