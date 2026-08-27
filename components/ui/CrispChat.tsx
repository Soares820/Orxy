'use client';

import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

declare global {
  interface Window {
    $crisp?: unknown[] & { push: (cmd: unknown[]) => void };
    CRISP_WEBSITE_ID?: string;
  }
}

const WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

export default function CrispChat() {
  const { state } = useApp();
  const user = state.user;

  useEffect(() => {
    if (!WEBSITE_ID || window.$crisp) return;

    window.$crisp = [] as unknown as Window['$crisp'];
    window.CRISP_WEBSITE_ID = WEBSITE_ID;

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!WEBSITE_ID || !window.$crisp || !user) return;
    if (user.email) window.$crisp.push(['set', 'user:email', [user.email]]);
    if (user.name) window.$crisp.push(['set', 'user:nickname', [user.name]]);
    if (user.clinicName) window.$crisp.push(['set', 'session:data', [[['clinica', user.clinicName]]]]);
  }, [user]);

  return null;
}
