import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CompareToggle } from "@/components/CompareToggle"
import { ProductImage } from "@/components/ProductImage"
import { addToCart } from "@/lib/actions"
import { fetchProduct } from "@/lib/catalog"
import { availabilityText, deliveryText, money, plural, returnsText } from "@/lib/format"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await fetchProduct((await params).handle)
  return { title: detail?.product.title ?? "Product not found" }
}

const ERRORS: Record<string, string> = {
  stock: "That quantity is no longer available. Try a smaller quantity.",
  offer: "That offer is no longer available.",
  region: "Shopping is not available in your region.",
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { handle } = await params
  const detail = await fetchProduct(handle)
  if (!detail) notFound()
  const { product, shipping } = detail
  const error = ERRORS[String((await searchParams).error ?? "")]
  const cheapest = product.offers[0]?.price
  const attributes = Object.entries(product.attributes ?? {})

  return (
    <div className="px-6 py-8 lg:px-10">
      {error && <p role="alert" className="mb-6 rounded-xl border border-terracotta bg-white p-4 font-semibold">{error}</p>}
      <div className="grid gap-8 lg:grid-cols-[24rem_1fr]">
        <ProductImage title={product.title} category={product.category_handle} />
        <div>
          <h1 className="font-serif text-3xl">{product.title}</h1>
          {product.brand && <p className="text-muted">{product.brand}</p>}
          {product.description && <p className="mt-3">{product.description}</p>}
          {attributes.length > 0 && (
            <dl className="mt-4 grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              {attributes.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold capitalize">{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-4"><CompareToggle handle={product.handle} title={product.title} /></div>
        </div>
      </div>

      <section aria-labelledby="offers" className="mt-10">
        <h2 id="offers" className="text-2xl font-semibold">{plural(product.offers.length, "offer", "offers")}</h2>
        <p className="mt-1 text-muted">
          Offers are sorted by price. No offer is promoted.
          {shipping && ` Shipping: ${money(shipping.price, shipping.currency_code)} per seller package (demo). `}
          Tax (1% illustrative) is added at checkout.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-sand bg-white">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <caption className="sr-only">Offers from sellers for {product.title}</caption>
            <thead>
              <tr className="border-b border-sand">
                {["Seller", "Condition", "Price", "Delivery", "Returns", "Availability", "Buy"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.offers.map((o) => {
                const soldOut = o.available !== null && o.available <= 0
                return (
                  <tr key={o.product_id} className="border-b border-sand align-top last:border-0">
                    <th scope="row" className="px-4 py-3 font-semibold">{o.vendor_name}</th>
                    <td className="px-4 py-3 capitalize">{o.condition}</td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-semibold">{money(o.price, o.currency_code)}</span>
                      {o.price === cheapest && <span className="ml-2 rounded-lg bg-sand px-2 py-0.5 text-sm">Lowest price</span>}
                      {shipping && <span className="block text-sm text-muted">+ {money(shipping.price, shipping.currency_code)} shipping</span>}
                    </td>
                    <td className="px-4 py-3">{deliveryText(o.delivery_days_min, o.delivery_days_max)}</td>
                    <td className="px-4 py-3">{returnsText(o.return_window_days)}</td>
                    <td className="px-4 py-3">{availabilityText(o.available)}</td>
                    <td className="px-4 py-3">
                      <form action={addToCart} className="flex items-center gap-2">
                        <input type="hidden" name="handle" value={product.handle} />
                        <input type="hidden" name="variant_id" value={o.variant_id} />
                        <label htmlFor={`qty-${o.product_id}`} className="sr-only">Quantity from {o.vendor_name}</label>
                        <select id={`qty-${o.product_id}`} name="quantity" defaultValue="1" disabled={soldOut} className="min-h-11 rounded-xl border border-muted bg-white px-2">
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <button
                          type="submit"
                          disabled={soldOut}
                          aria-label={`Add to cart from ${o.vendor_name}`}
                          className="min-h-11 rounded-xl bg-terracotta px-4 text-white disabled:bg-muted"
                        >
                          Add to cart
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">Delivery times and return windows are fictional demo values. <Link href="/legal/returns">Returns policy</Link></p>
      </section>
    </div>
  )
}
