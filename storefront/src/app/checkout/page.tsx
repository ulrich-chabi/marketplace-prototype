import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { placeOrder, prepareStripePayment } from "@/lib/actions"
import { getCart } from "@/lib/cart"
import { money } from "@/lib/format"
import { BACKEND_URL, PUBLISHABLE_KEY, sdk } from "@/lib/medusa"
import StripeCheckoutForm from "@/components/StripeCheckoutForm"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Checkout" }

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const cart = await getCart()
  if (!cart?.items.length) redirect("/cart")
  const params = await searchParams
  const stripeEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  const stripeTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ?? false
  const demoCheckoutEnabled = process.env.NODE_ENV !== "production" || process.env.DEMO_CHECKOUT_ENABLED === "true"
  const checkoutAvailable = stripeEnabled || demoCheckoutEnabled
  let stripeClientSecret = ""
  if (stripeEnabled && params.payment === "ready") {
    try {
      const { cart: retrievedPaymentCart } = await sdk.store.cart.retrieve(cart.id, {
        fields: "id,payment_collection.payment_sessions.provider_id,payment_collection.payment_sessions.data",
      })
      const paymentCart = retrievedPaymentCart as unknown as { payment_collection?: { payment_sessions?: Array<{ provider_id: string; data?: Record<string, unknown> }> } }
      const session = paymentCart.payment_collection?.payment_sessions?.find((item) => item.provider_id === "pp_stripe_stripe")
      stripeClientSecret = String(session?.data?.client_secret ?? "")
    } catch { /* un message de configuration est affiché plus bas */ }
  }
  let vendorCount = new Set(cart.items.map((item) => item.metadata?.vendor_handle ?? item.metadata?.vendor_name)).size
  try {
    const response = await fetch(`${BACKEND_URL}/store/carts/${cart.id}/vendor-count`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY }, cache: "no-store",
    })
    if (response.ok) vendorCount = (await response.json()).vendor_count
  } catch { /* fallback to the seller labels shown in the cart */ }
  const subtotal = cart.item_subtotal ?? cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const shippingMethodCount = cart.shipping_methods?.length ?? 0
  const shippingIsQuoted = shippingMethodCount > 0
  const shipping = shippingIsQuoted ? (cart.shipping_total ?? 0) : vendorCount * 5
  const provinces = [
    ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
    ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"],
    ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"],
    ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
  ]

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <h1 className="font-serif text-3xl">Checkout</h1>
      <p className="mt-2 rounded-xl border border-sand bg-white p-4 text-sm">
        {stripeEnabled
          ? stripeTestMode
            ? "Stripe secure checkout is in test mode. Use Stripe test cards; no real payment will be taken."
            : "Stripe secure checkout is enabled. Your payment will be authorized and captured by the platform when the order is prepared."
          : "Prototype only: use fictional contact and address details. Payment is simulated; no real charge will be made."}
      </p>
      {params.error === "details" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">Enter a valid email and complete all required address fields.</p>}
      {params.error === "order" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">We could not place this order. Check the cart and try again.</p>}
      {params.error === "payment" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">Secure payment is not configured. No order has been placed.</p>}
      {params.error === "seller" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">A seller or item in this cart is no longer available.</p>}
      {params.error === "shipping" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">No delivery option is available for this Canadian address.</p>}
      {stripeEnabled && params.payment === "ready" && !stripeClientSecret && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">The secure payment session could not be loaded. Return to your cart and try again.</p>}
      {!checkoutAvailable && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">Checkout is unavailable until Stripe is configured for this store.</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {stripeClientSecret ? <StripeCheckoutForm clientSecret={stripeClientSecret} /> : checkoutAvailable ? <form action={stripeEnabled ? prepareStripePayment : placeOrder} className="space-y-5 rounded-2xl border border-sand bg-white p-5">
          <h2 className="text-xl font-semibold">Contact and delivery</h2>
          <label className="block">Email address<input name="email" type="email" required autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">First name<input name="first_name" required autoComplete="given-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Last name<input name="last_name" required autoComplete="family-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          </div>
          <label className="block">Street address<input name="address_1" required autoComplete="street-address" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">City<input name="city" required autoComplete="address-level2" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Province or territory<select name="province" required autoComplete="address-level1" defaultValue="" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3"><option value="" disabled>Select a province or territory</option>{provinces.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <label className="block">Postal code<input name="postal_code" required autoComplete="postal-code" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Phone (optional)<input name="phone" type="tel" autoComplete="tel" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          </div>
          <p className="text-sm text-muted">Delivery is limited to Canada in this prototype.</p>
          {stripeEnabled
            ? <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Continue to secure payment</button>
            : <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Place demo order</button>}
        </form> : null}

        <aside className="h-fit rounded-2xl border border-sand bg-white p-5">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <ul className="mt-3 space-y-2">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.title} × {item.quantity}</span><span>{money(item.unit_price * item.quantity, cart.currency_code)}</span></li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-sand pt-4">
            <div className="flex justify-between"><dt>Items subtotal</dt><dd>{money(subtotal, cart.currency_code)}</dd></div>
            <div className="flex justify-between"><dt>{shippingIsQuoted ? `Shipping (${shippingMethodCount} ${shippingMethodCount === 1 ? "package" : "packages"})` : `Estimated shipping (${vendorCount} ${vendorCount === 1 ? "package" : "packages"})`}</dt><dd>{money(shipping, cart.currency_code)}</dd></div>
            <div className="flex justify-between"><dt>Estimated tax</dt><dd>{shippingIsQuoted && cart.tax_total != null ? money(cart.tax_total, cart.currency_code) : "Calculated after delivery details"}</dd></div>
            <div className="flex justify-between border-t border-sand pt-3 text-lg font-semibold"><dt>{shippingIsQuoted && cart.total != null ? "Current checkout total" : "Estimated total before tax"}</dt><dd>{money(shippingIsQuoted && cart.total != null ? cart.total : subtotal + shipping, cart.currency_code)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">Before delivery details, shipping uses the prototype estimate. The checkout total is refreshed after a delivery option is selected. Tax estimates may differ from the final tax obligation.</p>
          <Link href="/cart" className="mt-4 inline-block underline">Return to cart</Link>
        </aside>
      </div>
    </div>
  )
}
