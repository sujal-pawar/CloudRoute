"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, LoaderCircle, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

      if (next && next.startsWith("/")) {
        setNextPath(next)
      }
    }, 0)

    return () => window.clearTimeout(syncNextPath)
  }, [])

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
    <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top,hsl(197_98%_53%/0.18),transparent_50%),radial-gradient(circle_at_bottom_right,hsl(217_91%_60%/0.18),transparent_55%),hsl(222_45%_8%)] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.06),transparent)] opacity-25" />

      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-8">
        <div className="hidden max-w-md space-y-5 lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
            <ShieldCheck className="size-3.5" />
            CloudRoute Access
          </p>
          <h1 className="font-heading text-4xl leading-tight font-semibold">
            Secure sign in for your cloud cost command center.
          </h1>
          <p className="text-sm text-white/75">
            Use your username and password to access dashboards, anomaly alerts,
            and team optimization workflows.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-cyan-100"
          >
            <ArrowLeft className="size-4" />
            Back to landing page
          </Link>
        </div>

        <Card className="w-full max-w-md border border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl">Sign in to CloudRoute</CardTitle>
            <CardDescription className="text-white/75">
              Login or create an account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value as AuthMode)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-white/10">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form className="space-y-4" onSubmit={submitForm}>
                  <div className="space-y-1.5">
                    <label htmlFor="login-username" className="text-xs text-white/70">
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
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/45"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="login-password" className="text-xs text-white/70">
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
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/45"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
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

              <TabsContent value="signup" className="mt-5">
                <form className="space-y-4" onSubmit={submitForm}>
                  <div className="space-y-1.5">
                    <label htmlFor="signup-name" className="text-xs text-white/70">
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
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/45"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="signup-username" className="text-xs text-white/70">
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
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/45"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="signup-password" className="text-xs text-white/70">
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
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/45"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
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
  )
}
