"use client"

import Link from "next/link"
import { Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type CloudConnectionNoticeProps = {
  message?: string
  connectPath?: string
}

export function CloudConnectionNotice({
  message = "Connect a cloud account to load live cost and resource data.",
  connectPath = "/settings/cloud",
}: CloudConnectionNoticeProps) {
  return (
    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4">
      <p className="text-sm text-amber-100">{message}</p>
      <div className="mt-3">
        <Button asChild size="sm" className="gap-2 bg-amber-500 text-black hover:bg-amber-400">
          <Link href={connectPath}>
            <Link2 className="size-4" />
            Connect Cloud
          </Link>
        </Button>
      </div>
    </div>
  )
}
