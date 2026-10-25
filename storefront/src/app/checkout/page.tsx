import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { placeOrder } from "@/lib/actions"
import { getCart } from "@/lib/cart"
import { money } from "@/lib/format"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@/lib/medusa"

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
  let vendorCount = new Set(cart.items.map((item) => item.metadata?.vendor_handle ?? item.metadata?.vendor_name)).size
  try {
    const response = await fetch(`${BACKEND_URL}/store/carts/${cart.id}/vendor-count`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY }, cache: "no-store",
    })
    if (response.ok) vendorCount = (await response.json()).vendor_count
  } catch { /* fallback to the seller labels shown in the cart */ }
  const subtotal = cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const shipping = vendorCount * 5
  const estimatedTax = subtotal * 0.01

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <h1 className="font-serif text-3xl">Checkout</h1>
      <p className="mt-2 rounded-xl border border-sand bg-white p-4 text-sm">
        Prototype only: use fictional contact and address details. Payment is simulated; no real charge will be made.
      </p>
      {params.error === "details" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">Enter a valid email and complete all required address fields.</p>}
      {params.error === "order" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">We could not place this order. Check the cart and try again.</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <form action={placeOrder} className="space-y-5 rounded-2xl border border-sand bg-white p-5">
          <h2 className="text-xl font-semibold">Contact and delivery</h2>
          <label className="block">Email address<input name="email" type="email" required autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">First name<input name="first_name" required autoComplete="given-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Last name<input name="last_name" required autoComplete="family-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          </div>
          <label className="block">Street address<input name="address_1" required autoComplete="street-address" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">City<input name="city" required autoComplete="address-level2" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">State<input name="province" required autoComplete="address-level1" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">ZIP code<input name="postal_code" required autoComplete="postal-code" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Phone (optional)<input name="phone" type="tel" autoComplete="tel" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
          </div>
          <p className="text-sm text-muted">Delivery is simulated for the United States.</p>
          <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Place demo order</button>
        </form>

        <aside className="h-fit rounded-2xl border border-sand bg-white p-5">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <ul className="mt-3 space-y-2">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.title} × {item.quantity}</span><span>{money(item.unit_price * item.quantity, cart.currency_code)}</span></li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-sand pt-4">
            <div className="flex justify-between"><dt>Items subtotal</dt><dd>{money(subtotal, cart.currency_code)}</dd></div>
            <div className="flex justify-between"><dt>Shipping ({vendorCount} {vendorCount === 1 ? "package" : "packages"})</dt><dd>{money(shipping, cart.currency_code)}</dd></div>
            <div className="flex justify-between"><dt>Illustrative tax (1%)</dt><dd>{money(estimatedTax, cart.currency_code)}</dd></div>
            <div className="flex justify-between border-t border-sand pt-3 text-lg font-semibold"><dt>Estimated total</dt><dd>{money(subtotal + shipping + estimatedTax, cart.currency_code)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">Final tax and order totals are calculated by the backend.</p>
          <Link href="/cart" className="mt-4 inline-block underline">Return to cart</Link>
        </aside>
      </div>
    </div>
  )
}
