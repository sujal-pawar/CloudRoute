import { NextResponse } from "next/server"

import { createSession, createUser, sessionCookieConfig } from "@/lib/auth"

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)

  const username = typeof payload?.username === "string" ? payload.username.trim() : ""
  const password = typeof payload?.password === "string" ? payload.password : ""
  const name = typeof payload?.name === "string" ? payload.name.trim() : ""

  if (username.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters." },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    )
  }

  try {
    const user = await createUser({
      username,
      password,
      name,
    })

    const { token } = await createSession(user.id)

    const response = NextResponse.json({ user }, { status: 201 })
    response.cookies.set({
      ...sessionCookieConfig(),
      value: token,
    })

    return response
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json(
        { error: "That username is already in use." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Unable to create account right now." },
      { status: 500 }
    )
  }
}
