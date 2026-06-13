import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/signout", "/manifest.json", "/favicon.svg"];

export function middleware(req) {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  // Check for Supabase auth cookie — no Supabase client needed here.
  // Real auth verification happens in server components (Node.js runtime).
  const hasAuth = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  if (!hasAuth && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.*\\.svg|.*\\.png).*)"],
};
