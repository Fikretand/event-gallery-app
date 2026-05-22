import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env, hasSupabase } from "@/lib/env";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Paths that must never trigger a locale redirect. */
const SKIP_PREFIXES = ["/api/", "/auth/", "/_next/", "/favicon"];

function shouldSkipLocale(pathname: string): boolean {
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Static files (contain a dot in the last segment)
  const last = pathname.split("/").pop() ?? "";
  return last.includes(".");
}

/** Detect the preferred locale from Accept-Language header or the NEXT_LOCALE cookie. */
function detectLocale(request: NextRequest): Locale {
  // 1. Cookie wins (user explicitly switched language)
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie === "en" || cookie === "bs") return cookie;

  // 2. Accept-Language header — match Bosnian/Croatian/Serbian (very close to bs)
  const acceptLang = request.headers.get("accept-language") ?? "";
  if (/^(bs|hr)[-,;\s]|[,;\s](bs|hr)[-,;\s]/i.test(acceptLang + " ")) return "bs";

  // 3. Default
  return defaultLocale;
}

/** Run Supabase session refresh and return the response. */
async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabase || !env.supabaseUrl || !env.supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, auth callbacks, _next, and static files
  if (shouldSkipLocale(pathname)) {
    return refreshSupabaseSession(request);
  }

  // Check if pathname already has a known locale prefix
  const hasLocalePrefix = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`),
  );

  if (!hasLocalePrefix) {
    // Redirect to the locale-prefixed URL
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(url);
    // Persist locale preference for future redirects (e.g. after Server Actions)
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // Extract the active locale from the path and keep the cookie in sync
  const activeLocale =
    (locales.find(
      (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`),
    ) as Locale | undefined) ?? defaultLocale;

  const response = await refreshSupabaseSession(request);
  response.cookies.set("NEXT_LOCALE", activeLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
