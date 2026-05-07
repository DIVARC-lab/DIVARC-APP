import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicAuthRoute =
    path === "/login" || path.startsWith("/signup");
  const isMfaChallengeRoute = path.startsWith("/login/mfa");
  const isProtectedRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/profile") ||
    path.startsWith("/messages") ||
    path.startsWith("/friends") ||
    path.startsWith("/notifications") ||
    path.startsWith("/marketplace") ||
    path.startsWith("/feed") ||
    path.startsWith("/u/") ||
    path.startsWith("/jobs") ||
    path.startsWith("/wallet") ||
    path.startsWith("/stories") ||
    path.startsWith("/welcome") ||
    path.startsWith("/explore") ||
    path.startsWith("/admin");

  if (!user && (isProtectedRoute || isMfaChallengeRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Step-up MFA : si le compte a la 2FA mais l'AAL courant est aal1,
    // forcer la résolution sur /login/mfa avant tout accès protégé.
    if (isProtectedRoute) {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (
        aal &&
        aal.currentLevel === "aal1" &&
        aal.nextLevel === "aal2"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/login/mfa";
        return NextResponse.redirect(url);
      }
    }

    if (isPublicAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
