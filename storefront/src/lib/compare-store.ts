// Sélection de produits à comparer, gardée dans le navigateur (localStorage).
// Aucune donnée personnelle : seulement l'identifiant et le titre des fiches.
export type CompareItem = { handle: string; title: string }

export const MAX_COMPARE = 4
const KEY = "compare:v1"
const EVENT = "compare-change"

export function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(EVENT, callback)
  }
}

// Chaîne brute : stable entre deux lectures si rien n'a changé.
export const getSnapshot = () => window.localStorage.getItem(KEY) ?? "[]"
export const getServerSnapshot = () => "[]"

export function parse(raw: string): CompareItem[] {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((i) => i && typeof i.handle === "string" && typeof i.title === "string") : []
  } catch {
    return []
  }
}

function write(items: CompareItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // stockage indisponible : la sélection ne sera pas conservée
  }
  window.dispatchEvent(new Event(EVENT))
}

export function toggle(item: CompareItem) {
  const items = parse(getSnapshot())
  if (items.some((i) => i.handle === item.handle)) write(items.filter((i) => i.handle !== item.handle))
  else if (items.length < MAX_COMPARE) write([...items, item])
}

export const clear = () => write([])

// Aligne la sélection du navigateur sur la liste affichée (page de comparaison).
export function setSelection(items: CompareItem[]) {
  const next = items.slice(0, MAX_COMPARE)
  if (JSON.stringify(next) !== JSON.stringify(parse(getSnapshot()))) write(next)
}
