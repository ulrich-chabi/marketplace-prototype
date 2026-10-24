import type { Metadata } from "next"
import Link from "next/link"
import { ProductImage } from "@/components/ProductImage"
import { SyncCompareSelection } from "@/components/SyncCompareSelection"
import { fetchProduct } from "@/lib/catalog"
import { deliveryText, money, plural, returnsText } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Compare products" }

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = (await searchParams).h
  const handles = [...new Set(Array.isArray(raw) ? raw : raw ? [raw] : [])].slice(0, 4)
  const found = (await Promise.all(handles.map((h) => fetchProduct(h)))).filter((d) => d !== null)

  if (found.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-3xl">Compare products</h1>
        <p className="mt-4 rounded-2xl border border-sand bg-white p-5">
          Select at least 2 products to compare using the “Compare” checkboxes. <Link href="/search">Browse products</Link>.
        </p>
      </div>
    )
  }

  const best = Math.min(...found.map((d) => d.product.price_from))
  const colHref = (omit: string) =>
    `/compare?${found.filter((d) => d.product.handle !== omit).map((d) => `h=${encodeURIComponent(d.product.handle)}`).join("&")}`

  const rows: [string, (d: (typeof found)[number]) => React.ReactNode][] = [
    ["Brand", (d) => d.product.brand ?? "—"],
    ["Lowest price", (d) => (
      <>
        <strong>{money(d.product.price_from, d.product.currency_code)}</strong>
        {d.product.price_from === best && <span className="ml-2 rounded-lg bg-sand px-2 py-0.5 text-sm">Lowest of these</span>}
      </>
    )],
    ["Offers", (d) => `${plural(d.product.offers.length, "offer", "offers")} from ${plural(new Set(d.product.offers.map((o) => o.vendor_id)).size, "seller", "sellers")}`],
    ["Cheapest seller", (d) => d.product.offers[0]?.vendor_name ?? "—"],
    ["Condition", (d) => <span className="capitalize">{d.product.offers[0]?.condition ?? "—"}</span>],
    ["Delivery", (d) => deliveryText(d.product.offers[0]?.delivery_days_min ?? null, d.product.offers[0]?.delivery_days_max ?? null)],
    ["Returns", (d) => returnsText(d.product.offers[0]?.return_window_days ?? null)],
    ["Color", (d) => String(d.product.attributes?.color ?? "—")],
    ["Model", (d) => String(d.product.attributes?.model ?? "—")],
  ]

  return (
    <div className="px-6 py-8 lg:px-10">
      <SyncCompareSelection items={found.map((d) => ({ handle: d.product.handle, title: d.product.title }))} />
      <h1 className="font-serif text-3xl">Compare products</h1>
      <p className="mt-1 text-muted">
        Delivery, returns and condition are those of the lowest-priced offer. No product is promoted. <Link href="/search">Back to products</Link>
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-sand bg-white">
        <table className="w-full min-w-[40rem] table-fixed border-collapse text-left">
          <caption className="sr-only">Side-by-side comparison of {plural(found.length, "product", "products")}</caption>
          <colgroup>
            <col className="w-40" />
            {found.map((d) => <col key={d.product.handle} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-sand">
              <td className="px-4 py-3"><span className="sr-only">Feature</span></td>
              {found.map((d) => (
                <th key={d.product.handle} scope="col" className="px-4 py-3 align-top">
                  <ProductImage title={d.product.title} category={d.product.category_handle} />
                  <Link href={`/p/${d.product.handle}`} className="mt-2 block">{d.product.title}</Link>
                  <Link href={colHref(d.product.handle)} className="mt-1 block text-sm font-normal">Remove from comparison</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label} className="border-b border-sand last:border-0">
                <th scope="row" className="px-4 py-3 font-semibold">{label}</th>
                {found.map((d) => <td key={d.product.handle} className="px-4 py-3">{cell(d)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
