import { NextRequest, NextResponse } from "next/server"

import { deleteSession } from "@/lib/auth"
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    await deleteSession(token)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  return response
}
