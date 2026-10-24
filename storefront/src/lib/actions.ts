"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { fetchProduct } from "./catalog"
import { CART_COOKIE, getCartId } from "./cart"
import { sdk } from "./medusa"

const MAX_QTY = 10

// Ajoute UNE offre au panier. L'offre est relue côté serveur : le vendeur et le
// prix ne viennent jamais du navigateur.
export async function addToCart(formData: FormData) {
  const handle = String(formData.get("handle") ?? "")
  const variantId = String(formData.get("variant_id") ?? "")
  const quantity = Math.min(Math.max(Math.trunc(Number(formData.get("quantity") ?? 1)) || 1, 1), MAX_QTY)

  const detail = await fetchProduct(handle)
  const offer = detail?.product.offers.find((o) => o.variant_id === variantId)
  if (!offer) redirect(`/p/${encodeURIComponent(handle)}?error=offer`)

  let cartId: string | undefined = await getCartId()
  if (!cartId) {
    const { regions } = await sdk.store.region.list({ currency_code: offer.currency_code })
    const region = regions[0]
    if (!region) redirect(`/p/${encodeURIComponent(handle)}?error=region`)
    const { cart } = await sdk.store.cart.create({ region_id: region.id })
    const newId = cart.id as string
    cartId = newId
    ;(await cookies()).set(CART_COOKIE, newId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      // À activer (COOKIE_SECURE=true) derrière HTTPS.
      secure: process.env.COOKIE_SECURE === "true",
    })
  }

  const activeCartId = cartId as string
  let ok = true
  try {
    await sdk.store.cart.createLineItem(activeCartId, {
      variant_id: variantId,
      quantity,
      metadata: { vendor_name: offer.vendor_name, vendor_handle: offer.vendor_handle, catalog_handle: handle },
    })
  } catch {
    ok = false
  }
  // Le compteur du panier (en-tête) doit refléter immédiatement le changement.
  revalidatePath("/", "layout")
  if (!ok) redirect(`/p/${encodeURIComponent(handle)}?error=stock`)
  redirect("/cart?added=1")
}

export async function removeLine(formData: FormData) {
  const lineId = String(formData.get("line_id") ?? "")
  const cartId = await getCartId()
  if (cartId && lineId) {
    try {
      await sdk.store.cart.deleteLineItem(cartId, lineId)
    } catch {
      // ligne déjà supprimée : rien à faire
    }
  }
  revalidatePath("/", "layout")
  redirect("/cart")
}
