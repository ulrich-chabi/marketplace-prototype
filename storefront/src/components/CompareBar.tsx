"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { clear, getServerSnapshot, getSnapshot, MAX_COMPARE, parse, subscribe } from "@/lib/compare-store"

export function CompareBar() {
  const items = parse(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot))
  if (items.length === 0) return null
  const query = items.map((i) => `h=${encodeURIComponent(i.handle)}`).join("&")
  return (
    <section
      aria-label="Product comparison"
      className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-between gap-3 border-t border-sand bg-white px-6 py-3 lg:px-10"
    >
      <p aria-live="polite">
        {items.length} of {MAX_COMPARE} products selected
        {items.length === MAX_COMPARE ? " (limit reached)" : ""}
      </p>
      <div className="flex items-center gap-4">
        {items.length >= 2 ? (
          <Link href={`/compare?${query}`} className="rounded-xl bg-terracotta px-5 py-2 text-white no-underline">Compare</Link>
        ) : (
          <span className="text-muted">Select at least 2 products to compare</span>
        )}
        <button type="button" onClick={clear} className="min-h-11 rounded-xl border border-muted px-4">Clear selection</button>
      </div>
    </section>
  )
}
