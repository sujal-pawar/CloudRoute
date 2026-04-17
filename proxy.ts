import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE_NAME } from "@/lib/auth-constants"

function isPublicPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/auth")
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const isAuthenticated = Boolean(sessionToken)

  if (pathname.startsWith("/auth") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!isPublicPath(pathname) && !isAuthenticated) {
    const destination = new URL("/auth", request.url)
    destination.searchParams.set("next", pathname)
    return NextResponse.redirect(destination)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
