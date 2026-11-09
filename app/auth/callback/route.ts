import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const rawNext = requestUrl.searchParams.get("next") || "/";

  // Resolve the destination and verify its final origin. Checking only for a
  // leading slash is insufficient because URL parsing normalizes backslashes.
  const origin = requestUrl.origin;
  const isLocalPath =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\");
  let next = "/";
  if (isLocalPath) {
    try {
      const destination = new URL(rawNext, origin);
      if (destination.origin === origin) {
        next = `${destination.pathname}${destination.search}${destination.hash}`;
      }
    } catch {
      next = "/";
    }
  }

  if (providerError) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=confirmation", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/login?error=configuration", origin));
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, origin));
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  return response;
}
