import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware: security headers plus a cheap redirect for signed-out users.
 *
 * It deliberately does *not* make authorization decisions — it only checks
 * whether a session cookie exists, to avoid a pointless render. Every protected
 * page and API route re-checks the real session on the server, so forging the
 * cookie's presence gains nothing.
 */

const PROTECTED = [/^\/dashboard/, /^\/editor/, /^\/account/, /^\/admin/];

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED.some((pattern) => pattern.test(pathname));
  if (needsAuth) {
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", contentSecurityPolicy());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Frame protection for app pages. The template render routes set their own
  // sandbox CSP and are excluded from this matcher.
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  return response;
}

/**
 * Policy for the application origin. Template output is *not* covered here —
 * those routes are excluded from the matcher and carry their own
 * `sandbox` policy, which is what isolates untrusted template code.
 *
 * `script-src` still allows inline, because Next.js injects an inline bootstrap
 * and a nonce would have to be threaded through every render. That is a real
 * weakening of XSS defence in depth, and it is tolerable here specifically
 * because no untrusted HTML is ever rendered into this origin — user and
 * template content only ever reaches an opaque-origin iframe. If that ever
 * changes, this needs to become nonce-based.
 */
function contentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https://api.stripe.com https://*.public.blob.vercel-storage.com",
    // Previews are served from our own origin, so 'self' covers them.
    "frame-src 'self'",
    // Nothing should ever embed the application itself.
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    "base-uri 'self'",
    "object-src 'none'",
  ];

  if (process.env.NODE_ENV === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *  - /api/preview and /api/render (sandboxed template output, own headers)
     *  - /api/stripe/webhook (raw body, no rewriting)
     *  - Next.js internals and static files
     */
    "/((?!api/preview|api/render|api/stripe/webhook|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
