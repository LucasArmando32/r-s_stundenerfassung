import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import getDb from "@/lib/db";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  let user = null;
  if (session) {
    const db = getDb();
    user = db
      .prepare("select id, rol, activo from users where id = ?")
      .get(session.userId);
  }

  const loggedIn = Boolean(user && user.activo);

  if (!loggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (loggedIn && pathname.startsWith("/admin") && user.rol !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (loggedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = user.rol === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/export).*)"],
};
