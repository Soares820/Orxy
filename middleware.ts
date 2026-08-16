import { NextRequest, NextResponse } from 'next/server';

// ─── Per-route limits (requests per window) ───────────────────
const LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/reavix':    { max: 20,  windowMs: 60_000  },   // 20/min  (AI — caro)
  '/api/invite':    { max: 10,  windowMs: 3_600_000 }, // 10/hora (convites)
  '/api/checkout':  { max: 10,  windowMs: 60_000  },   // 10/min
};
const DEFAULT_LIMIT = { max: 60, windowMs: 60_000 };   // 60/min demais rotas

// ─── Rotas que nunca devem ser limitadas ─────────────────────
const BYPASS = ['/api/webhook'];

// ─── Armazenamento em memória (por instância edge) ────────────
const store = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// Cookie name set by Supabase client (matches project ref from NEXT_PUBLIC_SUPABASE_URL)
const SUPABASE_COOKIE_PREFIX = 'sb-';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard: /dashboard requer sessão Supabase via cookie
  if (pathname.startsWith('/dashboard')) {
    const hasSession = [...request.cookies.getAll()].some(
      (c) => c.name.startsWith(SUPABASE_COOKIE_PREFIX) && c.name.endsWith('-auth-token')
    );
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Só aplica rate-limit em API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Rotas excluídas (Stripe webhook etc.)
  if (BYPASS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const ip = getIp(request);
  const routeKey = Object.keys(LIMITS).find((k) => pathname.startsWith(k)) ?? '';
  const { max, windowMs } = LIMITS[routeKey] ?? DEFAULT_LIMIT;
  const key = `${ip}:${routeKey || pathname}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
  } else {
    entry.count++;
  }

  const remaining = Math.max(0, max - entry.count);
  const headers: Record<string, string> = {
    'X-RateLimit-Limit':     String(max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(entry.resetAt),
  };

  if (entry.count > max) {
    return new NextResponse(
      JSON.stringify({ error: 'Muitas requisições. Aguarde e tente novamente.', retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          ...headers,
        },
      }
    );
  }

  const response = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/dashboard'],
};
