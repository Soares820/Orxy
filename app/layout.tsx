import type { Metadata, Viewport } from 'next';
import './globals.css';
import './app-legacy.css';
import ToastContainer from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: {
    default: 'ORYX — Software para Terapia ABA',
    template: '%s | ORYX',
  },
  description:
    'Plataforma de gestão clínica completa para terapeutas que atendem TEA. Avaliações PEDI, PEI inteligente, BI em tempo real e comunicação com famílias.',
  keywords: ['ABA', 'TEA', 'autismo', 'terapia ocupacional', 'software clínico', 'PEDI', 'PEI'],
  authors: [{ name: 'ORYX' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'ORYX',
    title: 'ORYX — Software para Terapia ABA',
    description: 'Plataforma de gestão clínica completa para terapeutas que atendem TEA.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Speed Insights — Vercel (vanilla script, funciona sem Next.js SDK) */}
        <script defer src="/_vercel/speed-insights/script.js" />
        {/* Stripe — desativado temporariamente */}
        {/* <script src="https://js.stripe.com/v3/" async /> */}
      </head>
      <body>
        {children}
        <ToastContainer />
        <div id="toast-container" />
      </body>
    </html>
  );
}
