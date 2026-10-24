"use client"

import { useSyncExternalStore } from "react"
import { getServerSnapshot, getSnapshot, MAX_COMPARE, parse, subscribe, toggle } from "@/lib/compare-store"

export function CompareToggle({ handle, title }: { handle: string; title: string }) {
  const items = parse(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot))
  const checked = items.some((i) => i.handle === handle)
  const full = !checked && items.length >= MAX_COMPARE
  return (
    <label className={`inline-flex min-h-11 items-center gap-2 ${full ? "text-muted" : ""}`}>
      <input
        type="checkbox"
        className="h-5 w-5 accent-teal"
        checked={checked}
        disabled={full}
        onChange={() => toggle({ handle, title })}
      />
      <span>
        Compare<span className="sr-only"> {title}</span>
        {full && <span className="sr-only"> (limit of {MAX_COMPARE} products reached)</span>}
      </span>
    </label>
  )
}
