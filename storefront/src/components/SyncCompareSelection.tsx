"use client"

import { useEffect } from "react"
import { CompareItem, setSelection } from "@/lib/compare-store"

// Garde la barre de comparaison cohérente avec les produits affichés sur la page.
export function SyncCompareSelection({ items }: { items: CompareItem[] }) {
  const key = JSON.stringify(items)
  useEffect(() => {
    setSelection(JSON.parse(key) as CompareItem[])
  }, [key])
  return null
}
