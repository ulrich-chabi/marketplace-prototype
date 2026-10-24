import type { Metadata } from "next"
import Link from "next/link"
import { removeLine } from "@/lib/actions"
import { cartCount, getCart } from "@/lib/cart"
import { money, plural } from "@/lib/format"

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
        <p className="mt-2 text-sm text-muted">Shipping, tax and the order total are shown at checkout, which is coming in the next release.</p>
      </div>
    </div>
  )
}
