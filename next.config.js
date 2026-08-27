/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Headers de segurança (migrado do vercel.json)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://client.crisp.chat",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.resend.com https://wa.me https://eutils.ncbi.nlm.nih.gov https://api.ncbi.nlm.nih.gov https://api.anthropic.com https://client.crisp.chat https://client.relay.crisp.chat wss://client.relay.crisp.chat https://storage.crisp.chat",
              "frame-src https://js.stripe.com",
              "font-src 'self' data: https://fonts.gstatic.com https://client.crisp.chat",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
