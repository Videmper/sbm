import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "img-src 'self' data: blob: cdn.jsdelivr.net",
    "font-src 'self' fonts.gstatic.com",
    "connect-src 'self' *.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Pragma": "no-cache",
  "Cache-Control": "no-store, max-age=0",
};

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 100;
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.reset) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// Define protected routes and their required roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/dashboard": ["admin", "loan_officer", "field_officer", "savings_member"],
  "/clients": ["admin", "loan_officer", "field_officer"],
  "/loans": ["admin", "loan_officer"],
  "/loan-simulator": ["admin", "loan_officer"],
  "/savings": ["admin", "loan_officer", "savings_member"],
  "/transactions": ["admin", "loan_officer", "field_officer", "savings_member"],
  "/reports": ["admin", "loan_officer"],
  "/sync": ["admin", "loan_officer"],
  "/settings": ["admin"],
};

function getSessionFromRequest(request: NextRequest): { user: any; error: string | null } {
  try {
    const sessionHeader = request.headers.get("Cookie") || "";
    const sessionMatch = sessionHeader.match(/sb_session=([^;]+)/);
    if (!sessionMatch) return { user: null, error: "No session found" };

    const session = JSON.parse(decodeURIComponent(sessionMatch[1]));
    if (!session.user) return { user: null, error: "Invalid session" };

    return { user: session.user, error: null };
  } catch {
    return { user: null, error: "Invalid session" };
  }
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ?? "unknown";
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Skip static assets and API health
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    const response = NextResponse.next();
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(header, value);
    }
    return response;
  }

  // Rate limiting
  if (!pathname.startsWith("/_next/static") && !pathname.startsWith("/api/")) {
    if (!checkRateLimit(ip)) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Content-Type": "text/plain",
          "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW / 1000)),
        },
      });
    }
  }

  const response = NextResponse.next();

  // Security headers
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  // CORS for API routes
  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin") ?? "";
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://sauti.sautiyamkenya.co.ke",
      "https://sbm.sautiyamkenya.co.ke",
    ];
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  // Role-based access control for protected pages
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/clients") ||
      pathname.startsWith("/loans") || pathname.startsWith("/loan-simulator") ||
      pathname.startsWith("/savings") || pathname.startsWith("/transactions") ||
      pathname.startsWith("/reports") || pathname.startsWith("/sync") ||
      pathname.startsWith("/settings")) {

    const { user, error } = getSessionFromRequest(request);

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user.status === "inactive") {
      return NextResponse.redirect(new URL("/login?error=inactive", request.url));
    }

    // Check route access
    for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(user.role)) {
          return new NextResponse("Forbidden: Insufficient permissions", { status: 403 });
        }
        break;
      }
    }
  }

  // Login page: redirect authenticated users
  if (pathname === "/login" && url.searchParams.has("redirectTo")) {
    const { user } = getSessionFromRequest(request);
    if (user) {
      const redirectTo = url.searchParams.get("redirectTo") || "/dashboard";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};