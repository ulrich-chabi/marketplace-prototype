"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { fetchProduct } from "./catalog"
import { CART_COOKIE, getCart, getCartId } from "./cart"
import { BACKEND_URL, PUBLISHABLE_KEY, sdk } from "./medusa"

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

export async function placeOrder(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const firstName = String(formData.get("first_name") ?? "").trim()
  const lastName = String(formData.get("last_name") ?? "").trim()
  const address = String(formData.get("address_1") ?? "").trim()
  const city = String(formData.get("city") ?? "").trim()
  const state = String(formData.get("province") ?? "").trim()
  const postal = String(formData.get("postal_code") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  if (!/^\S+@\S+\.\S+$/.test(email) || !firstName || !lastName || !address || !city || !state || !postal) {
    redirect("/checkout?error=details")
  }

  const cartId = await getCartId()
  const cart = await getCart()
  if (!cartId || !cart?.items.length) redirect("/cart?error=empty")

  try {
    const customerToken = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
    const customerHeaders = customerToken ? { Authorization: `Bearer ${customerToken}` } : undefined
    if (customerHeaders) await sdk.store.cart.transferCart(cartId, {}, customerHeaders)
    const headers = { "x-publishable-api-key": PUBLISHABLE_KEY }
    const vendorResult = await fetch(`${BACKEND_URL}/store/carts/${cartId}/vendor-count`, { headers, cache: "no-store" })
    if (!vendorResult.ok) throw new Error("A seller is unavailable")
    const { vendor_count: vendorCount } = (await vendorResult.json()) as { vendor_count: number }
    if (!vendorCount) throw new Error("The cart has no available items")

    const { cart: addressedCart } = await sdk.store.cart.update(cartId, {
      email,
      shipping_address: {
        first_name: firstName,
        last_name: lastName,
        address_1: address,
        city,
        province: state,
        postal_code: postal,
        country_code: "us",
        phone: phone || undefined,
      },
      billing_address: {
        first_name: firstName,
        last_name: lastName,
        address_1: address,
        city,
        province: state,
        postal_code: postal,
        country_code: "us",
        phone: phone || undefined,
      },
    })

    const { shipping_options: options } = await sdk.store.fulfillment.listCartOptions({ cart_id: cartId })
    const standard = options.find((option: { id: string; name: string }) => option.name === "Standard") ?? options[0]
    if (!standard) throw new Error("No shipping option is available for this address")
    for (let i = 0; i < vendorCount; i++) {
      await sdk.store.cart.addShippingMethod(cartId, { option_id: standard.id })
    }

    await sdk.store.payment.initiatePaymentSession(addressedCart, { provider_id: "pp_system_default" })
    const completed = await sdk.client.fetch<{
      order?: { id: string; display_id?: number; total?: number }
      tracking_code?: string
      type?: string
      error?: { message?: string }
    }>(`/store/carts/${cartId}/complete-vendor`, { method: "POST", body: {} })
    if (!completed.order || !completed.tracking_code) throw new Error(completed.error?.message ?? "The order could not be completed")

    const cookieStore = await cookies()
    cookieStore.set("checkout_receipt", JSON.stringify({
      order: completed.order.id,
      orderNumber: completed.order.display_id,
      total: completed.order.total ?? null,
      trackingCode: completed.tracking_code,
    }), {
      httpOnly: true,
      sameSite: "lax",
      path: "/checkout/confirmation",
      maxAge: 60 * 10,
      secure: process.env.COOKIE_SECURE === "true",
    })
    cookieStore.set("tracked_order", JSON.stringify({
      order_id: completed.order.id,
      access_code: completed.tracking_code,
    }), {
      httpOnly: true,
      sameSite: "lax",
      path: "/account",
      maxAge: 60 * 60 * 24 * 90,
      secure: process.env.COOKIE_SECURE === "true",
    })
    cookieStore.delete(CART_COOKIE)
    revalidatePath("/", "layout")
    redirect("/checkout/confirmation")
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    redirect("/checkout?error=order")
  }
}

export async function lookupOrder(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "").trim()
  const accessCode = String(formData.get("access_code") ?? "").trim()
  if (!/^order_[a-zA-Z0-9_]+$/.test(orderId) || accessCode.length < 40 || accessCode.length > 50) {
    redirect("/account?error=lookup")
  }

  try {
    await sdk.client.fetch("/store/order-tracking", {
      method: "POST",
      body: { order_id: orderId, access_code: accessCode },
    })
  } catch {
    redirect("/account?error=lookup")
  }

  const cookieStore = await cookies()
  cookieStore.set("tracked_order", JSON.stringify({ order_id: orderId, access_code: accessCode }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/account",
    maxAge: 60 * 60 * 24 * 90,
    secure: process.env.COOKIE_SECURE === "true",
  })
  redirect("/account")
}

export async function forgetTrackedOrder() {
  const cookieStore = await cookies()
  cookieStore.set("tracked_order", "", { httpOnly: true, sameSite: "lax", path: "/account", maxAge: 0 })
  redirect("/account")
}

const CUSTOMER_TOKEN_COOKIE = "customer_token"

function validCustomerForm(email: string, password: string) {
  return /^\S+@\S+\.\S+$/.test(email) && password.length >= 4 && password.length <= 128
}

export async function registerCustomer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const firstName = String(formData.get("first_name") ?? "").trim()
  const lastName = String(formData.get("last_name") ?? "").trim()
  if (!validCustomerForm(email, password) || !firstName || !lastName) redirect("/account?error=register")

  try {
    const { token } = await sdk.client.fetch<{ token: string }>("/auth/customer/emailpass/register", {
      method: "POST", body: { email, password },
    })
    await sdk.client.fetch("/store/customers", {
      method: "POST", body: { email, password, first_name: firstName, last_name: lastName },
      headers: { Authorization: `Bearer ${token}` },
    })
    const authenticated = await sdk.client.fetch<{ token: string }>("/auth/customer/emailpass", {
      method: "POST", body: { email, password },
    })
    if (!authenticated.token) throw new Error("Missing customer token")
    ;(await cookies()).set(CUSTOMER_TOKEN_COOKIE, authenticated.token, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
      secure: process.env.COOKIE_SECURE === "true",
    })
  } catch {
    redirect("/account?error=register")
  }
  revalidatePath("/", "layout")
  redirect("/account")
}

export async function loginCustomer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  if (!validCustomerForm(email, password)) redirect("/account?error=login")
  try {
    const { token } = await sdk.client.fetch<{ token: string }>("/auth/customer/emailpass", {
      method: "POST", body: { email, password },
    })
    if (!token) throw new Error("Missing customer token")
    await sdk.store.customer.retrieve({}, { Authorization: `Bearer ${token}` })
    ;(await cookies()).set(CUSTOMER_TOKEN_COOKIE, token, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
      secure: process.env.COOKIE_SECURE === "true",
    })
  } catch {
    redirect("/account?error=login")
  }
  revalidatePath("/", "layout")
  redirect("/account")
}

export async function logoutCustomer() {
  const cookieStore = await cookies()
  cookieStore.set(CUSTOMER_TOKEN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 })
  revalidatePath("/", "layout")
  redirect("/account")
}

export async function updateCustomerProfile(formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim()
  const lastName = String(formData.get("last_name") ?? "").trim()
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token || !firstName || !lastName) redirect("/account?error=profile")
  try {
    await sdk.store.customer.update({ first_name: firstName, last_name: lastName }, {}, { Authorization: `Bearer ${token}` })
  } catch {
    redirect("/account?error=profile")
  }
  revalidatePath("/account")
  redirect("/account?saved=1")
}
