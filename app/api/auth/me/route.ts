import { NextRequest, NextResponse } from "next/server"

import { getUserBySessionToken } from "@/lib/auth"
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const user = await getUserBySessionToken(token)

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user })
}
