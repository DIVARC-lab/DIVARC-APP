import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Endpoint dev-only pour automatiser les captures Playwright sur /feed.
 *
 * - Refusé en production (404)
 * - Lit TEST_USER_EMAIL + TEST_USER_PASSWORD depuis l'env
 * - Sign in via Supabase, set le cookie de session
 * - Redirect vers /feed (ou ?next=/<path>)
 *
 * Usage Playwright :
 *   await page.goto('/api/dev/login');  // → redirect /feed avec session
 *
 * NE PAS exposer ce endpoint en prod. La garde NODE_ENV est suffisante
 * tant que Vercel build met bien NODE_ENV=production. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      {
        error: "missing-test-creds",
        hint:
          "Définis TEST_USER_EMAIL et TEST_USER_PASSWORD dans .env.local " +
          "pour activer le bypass dev.",
      },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: "signin-failed", message: error.message },
      { status: 401 },
    );
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/feed";
  /* Restreint le redirect aux paths internes (anti open-redirect). */
  const safeNext = next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/feed";
  return NextResponse.redirect(new URL(safeNext, request.url));
}
