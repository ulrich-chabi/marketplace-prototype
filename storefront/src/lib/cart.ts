import { cookies } from "next/headers"
import { sdk } from "./medusa"

export const CART_COOKIE = "cart_id"

export type CartLine = {
  id: string
  title: string
  quantity: number
  unit_price: number
  metadata?: { vendor_name?: string; vendor_handle?: string; catalog_handle?: string } | null
}
export type Cart = { id: string; currency_code: string; items: CartLine[] }

export async function getCartId() {
  return (await cookies()).get(CART_COOKIE)?.value
}

// Panier de la personne qui visite le site (cookie essentiel, sans donnée personnelle).
export async function getCart(): Promise<Cart | null> {
  const id = await getCartId()
  if (!id) return null
  try {
    const { cart } = await sdk.store.cart.retrieve(id, { fields: "id,currency_code,*items" })
    return cart as unknown as Cart
  } catch {
    return null // panier expiré ou supprimé
  }
}

export const cartCount = (cart: Cart | null) =>
  (cart?.items ?? []).reduce((sum, l) => sum + l.quantity, 0)
