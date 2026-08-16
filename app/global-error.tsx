'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: 16,
        background: '#ECEEF8', fontFamily: 'system-ui, sans-serif', margin: 0, padding: 24,
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0D1526' }}>
          Erro crítico
        </div>
        <div style={{ fontSize: 14, color: '#94A3B8', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          Ocorreu um erro inesperado no sistema. Tente recarregar a página.
        </div>
        <button
          onClick={reset}
          style={{
            marginTop: 8, padding: '11px 24px', borderRadius: 10, border: 'none',
            background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
