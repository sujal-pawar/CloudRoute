"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { PublicNavbar } from "@/components/layout/PublicNavbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEMO_PASSWORD, DEMO_USERNAME } from "@/lib/demo-credentials"

type AuthMode = "login" | "signup"

interface FormState {
  username: string
  password: string
  name: string
}

const initialState: FormState = {
  username: "",
  password: "",
  name: "",
}

export default function AuthPage() {
  const router = useRouter()

  const [mode, setMode] = useState<AuthMode>("login")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<FormState>(initialState)
  const [nextPath, setNextPath] = useState("/dashboard")

  useEffect(() => {
    const syncNextPath = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const next = params.get("next")
      const tab = params.get("tab")

      if (next && next.startsWith("/")) {
        setNextPath(next)
      }

      if (tab === "login" || tab === "signup") {
        setMode(tab)
      }
    }, 0)

    return () => window.clearTimeout(syncNextPath)
  }, [])

  function applyDemoCredentials() {
    setMode("login")
    setFormState((prev) => ({
      ...prev,
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
    }))
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formState.username || !formState.password) {
      toast.error("Enter your username and password.")
      return
    }

    if (mode === "signup" && !formState.name.trim()) {
      toast.error("Enter your name before creating an account.")
      return
    }

    setIsSubmitting(true)

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup"

      const payload = {
        username: formState.username,
        password: formState.password,
        name: formState.name,
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast.error(data.error || "Authentication failed. Try again.")
        return
      }

      toast.success(mode === "login" ? "Welcome back." : "Account created successfully.")
      router.push(nextPath)
      router.refresh()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-svh bg-[radial-gradient(circle_at_top,hsl(197_98%_53%/0.18),transparent_50%),radial-gradient(circle_at_bottom_right,hsl(217_91%_60%/0.18),transparent_55%),hsl(222_45%_8%)] px-4 py-8 text-white sm:py-10">      

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <PublicNavbar active={mode} onAuthModeChange={setMode} />

        <div className="mt-2 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                <ShieldCheck className="size-3.5" />
                CloudRoute Access
              </p>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Cloud cost workspace.
                </h1>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-4 text-sm text-cyan-50 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Demo credentials</p>
                  <p className="mt-1 text-xs text-cyan-100/85">
                    Use this account to view seeded sample data immediately.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 shrink-0 bg-cyan-300 px-3 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
                  onClick={applyDemoCredentials}
                >
                  Autofill
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                    Username
                  </p>
                  <p className="mt-1 font-semibold text-white">{DEMO_USERNAME}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                    Password
                  </p>
                  <p className="mt-1 font-semibold text-white">{DEMO_PASSWORD}</p>
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-cyan-100"
            >
              <ArrowLeft className="size-4" />
              Back to landing page
            </Link>
          </div>

          <Card className="w-full border border-white/15 bg-slate-950/50 text-white shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
            <CardHeader className="space-y-4 border-b border-white/10 pb-6">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-100">
                <Sparkles className="size-3" />
                Team workspace
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl">Sign in to CloudRoute</CardTitle>
                <CardDescription className="max-w-sm text-white/70">
                  Login or create an account to continue into the demo environment.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-7">
              <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)} className="w-full">
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-white/10 p-1">
                  <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-cyan-400/95 data-[state=active]:text-slate-950">
                    Login
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-cyan-400/95 data-[state=active]:text-slate-950">
                    Sign up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6 space-y-5">
                  <form className="space-y-4" onSubmit={submitForm}>
                    <div className="space-y-2">
                      <label htmlFor="login-username" className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">
                        Username
                      </label>
                      <Input
                        id="login-username"
                        value={formState.username}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, username: event.target.value }))
                        }
                        placeholder="your.username"
                        autoComplete="username"
                        className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-cyan-300/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">
                        Password
                      </label>
                      <Input
                        id="login-password"
                        type="password"
                        value={formState.password}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, password: event.target.value }))
                        }
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-cyan-300/70"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-11 w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    >
                      {isSubmitting ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6 space-y-5">
                  <form className="space-y-4" onSubmit={submitForm}>
                    <div className="space-y-2">
                      <label htmlFor="signup-name" className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">
                        Name
                      </label>
                      <Input
                        id="signup-name"
                        value={formState.name}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="Alex Doe"
                        autoComplete="name"
                        className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-cyan-300/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="signup-username" className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">
                        Username
                      </label>
                      <Input
                        id="signup-username"
                        value={formState.username}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, username: event.target.value }))
                        }
                        placeholder="alex.ops"
                        autoComplete="username"
                        className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-cyan-300/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="signup-password" className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">
                        Password
                      </label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={formState.password}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, password: event.target.value }))
                        }
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-cyan-300/70"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-11 w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    >
                      {isSubmitting ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
