'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', flexDirection: 'column', gap: 16,
      background: 'var(--bg)', fontFamily: 'inherit', padding: 24,
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>
        Algo deu errado
      </div>
      <div style={{ fontSize: 14, color: 'var(--t3)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
        Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
      </div>
      <button
        onClick={reset}
        style={{
          marginTop: 8, padding: '11px 24px', borderRadius: 10, border: 'none',
          background: 'var(--p)', color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
