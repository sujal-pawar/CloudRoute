import { NextResponse } from "next/server"

import { createSession, sessionCookieConfig, verifyCredentials } from "@/lib/auth"

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)

  const username = typeof payload?.username === "string" ? payload.username.trim() : ""
  const password = typeof payload?.password === "string" ? payload.password : ""

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    )
  }

  const user = await verifyCredentials(username, password)

  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    )
  }

  const { token } = await createSession(user.id)

  const response = NextResponse.json({ user })
  response.cookies.set({
    ...sessionCookieConfig(),
    value: token,
  })

  return response
}
