import type { Metadata } from "next"
import Link from "next/link"
import { removeLine } from "@/lib/actions"
import { cartCount, getCart } from "@/lib/cart"
import { money, plural } from "@/lib/format"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@/lib/medusa"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Cart" }

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const cart = await getCart()
  const added = (await searchParams).added === "1"
  const items = cart?.items ?? []

  if (!cart || items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-3xl">Cart</h1>
        <p className="mt-4 rounded-2xl border border-sand bg-white p-5">
          Your cart is empty. <Link href="/search">Browse products</Link>.
        </p>
      </div>
    )
  }

  // Les lignes sont regroupées par vendeur : chaque vendeur expédie son propre colis.
  const bySeller = new Map<string, typeof items>()
  for (const line of items) {
    const seller = line.metadata?.vendor_name ?? "Seller"
    bySeller.set(seller, [...(bySeller.get(seller) ?? []), line])
  }
  const total = items.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  let sellerCount = bySeller.size
  try {
    const response = await fetch(`${BACKEND_URL}/store/carts/${cart.id}/vendor-count`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY }, cache: "no-store",
    })
    if (response.ok) sellerCount = (await response.json()).vendor_count
  } catch { /* le panier reste consultable si l'API ne répond pas */ }

  return (
    <div className="px-6 py-8 lg:px-10">
      <h1 className="font-serif text-3xl">Cart</h1>
      {added && <p role="status" className="mt-3 rounded-xl border border-teal bg-white p-3 font-semibold">Added to cart.</p>}
      <p className="mt-2 text-muted">{plural(cartCount(cart), "item", "items")} from {plural(bySeller.size, "seller", "sellers")}. Each seller ships its own package.</p>

      <div className="mt-6 space-y-6">
        {[...bySeller.entries()].map(([seller, lines]) => (
          <section key={seller} aria-label={`Items from ${seller}`} className="rounded-2xl border border-sand bg-white p-5">
            <h2 className="text-xl font-semibold">Sold by {seller}</h2>
            <table className="mt-3 w-full border-collapse text-left">
              <caption className="sr-only">Items from {seller}</caption>
              <thead>
                <tr className="border-b border-sand">
                  <th scope="col" className="py-2 pr-4">Item</th>
                  <th scope="col" className="py-2 pr-4">Quantity</th>
                  <th scope="col" className="py-2 pr-4">Price</th>
                  <th scope="col" className="py-2 pr-4">Total</th>
                  <th scope="col" className="py-2"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-sand last:border-0">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      {l.metadata?.catalog_handle ? <Link href={`/p/${l.metadata.catalog_handle}`}>{l.title}</Link> : l.title}
                    </th>
                    <td className="py-3 pr-4">{l.quantity}</td>
                    <td className="py-3 pr-4">{money(l.unit_price, cart.currency_code)}</td>
                    <td className="py-3 pr-4">{money(l.unit_price * l.quantity, cart.currency_code)}</td>
                    <td className="py-3">
                      <form action={removeLine}>
                        <input type="hidden" name="line_id" value={l.id} />
                        <button type="submit" aria-label={`Remove ${l.title}`} className="min-h-11 rounded-xl border border-muted px-3">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <div className="mt-6 max-w-md rounded-2xl border border-sand bg-white p-5">
        <p className="flex justify-between text-lg"><span>Items subtotal</span><strong>{money(total, cart.currency_code)}</strong></p>
        <p className="mt-2 flex justify-between"><span>Estimated shipping</span><span>{money(sellerCount * 5, cart.currency_code)}</span></p>
        <p className="mt-1 flex justify-between"><span>Illustrative tax (1%)</span><span>{money(total * 0.01, cart.currency_code)}</span></p>
        <p className="mt-2 text-sm text-muted">Final totals are calculated by the store at checkout.</p>
        <Link href="/checkout" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-terracotta px-5 text-white">Continue to checkout</Link>
      </div>
    </div>
  )
}
