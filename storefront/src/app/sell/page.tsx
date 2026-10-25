import type { Metadata } from "next"
import { cookies } from "next/headers"
import { createVendorProduct, loginVendor, logoutVendor, registerVendor, updateVendorStock } from "@/lib/actions"
import { money } from "@/lib/format"
import { sdk } from "@/lib/medusa"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Seller space" }

type Vendor = { id: string; name: string; handle: string; status: "pending" | "active" | "suspended" }
type Product = { id: string; title: string; handle: string; status: string; variants?: { id: string; title: string; manage_inventory: boolean }[] }
type Stock = { variant_id: string; title: string; stocked_quantity: number | null; reserved_quantity: number | null }
type VendorOrder = { id: string; display_id: number; status: string; email: string; total: number; currency_code: string; created_at: string; items: { title: string; quantity: number }[] }

function statusText(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function SellerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const token = (await cookies()).get("vendor_token")?.value
  let vendor: Vendor | null = null
  let products: Product[] = []
  let stock: Stock[] = []
  let orders: VendorOrder[] = []
  if (token) {
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const response = await sdk.client.fetch<{ vendor: Vendor }>("/vendors", { headers })
      vendor = response.vendor
      if (vendor.status === "active") {
        const [productResponse, stockResponse, orderResponse] = await Promise.all([
          sdk.client.fetch<{ products: Product[] }>("/vendors/products", { headers }),
          sdk.client.fetch<{ stock: Stock[] }>("/vendors/stock", { headers }),
          sdk.client.fetch<{ orders: VendorOrder[] }>("/vendors/orders", { headers }),
        ])
        products = productResponse.products
        stock = stockResponse.stock
        orders = orderResponse.orders
      } else if (vendor.status === "suspended") {
        const response = await sdk.client.fetch<{ orders: VendorOrder[] }>("/vendors/orders", { headers })
        orders = response.orders
      }
    } catch {
      vendor = null
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-3xl">Seller space</h1>
      <p className="mt-3 text-muted">Demo seller tools for offers, inventory and orders. Payments and fulfillment are simulated.</p>
      {params.error && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">We could not complete that request. Check the details and try again. If a product was created but its stock update failed, refresh this page to see it.</p>}
      {params.registered === "1" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Your application was submitted. The platform must approve your store before you can list products.</p>}
      {params.product === "created" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Product and starting stock saved.</p>}
      {params.stock === "updated" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Stock updated.</p>}

      {vendor ? (
        <>
          <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-xl font-semibold">{vendor.name}</h2><p className="mt-1 text-sm text-muted">Seller status: <strong>{statusText(vendor.status)}</strong></p></div>
              <form action={logoutVendor}><button type="submit" className="min-h-11 rounded-xl border border-muted px-4">Sign out</button></form>
            </div>
            {vendor.status === "pending" && <p className="mt-4 rounded-xl bg-sand-soft p-4">Your seller application is waiting for platform approval. You can sign in again later to check its status.</p>}
            {vendor.status === "suspended" && <p className="mt-4 rounded-xl bg-sand-soft p-4">Your account is suspended. You can review existing orders, but cannot edit products or stock. Contact the platform administrator for help.</p>}
          </section>

          {vendor.status === "active" && <>
            <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
              <h2 className="text-xl font-semibold">Add a product</h2>
              <form action={createVendorProduct} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">Product name<input name="title" minLength={3} maxLength={120} required className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
                <label className="sm:col-span-2">Description<textarea name="description" maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border border-muted px-3 py-2" /></label>
                <label>Price (USD)<input name="price" type="number" min="0.01" max="100000" step="0.01" required className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
                <label>Starting stock<input name="stock" type="number" min="0" max="100000" step="1" required className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
                <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white sm:col-span-2">Create product</button>
              </form>
            </section>

            <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
              <h2 className="text-xl font-semibold">Your products and stock</h2>
              {products.length ? <div className="mt-3 divide-y divide-sand">{products.map((product) => <article key={product.id} className="py-4"><h3 className="font-semibold">{product.title}</h3><p className="text-sm text-muted">{statusText(product.status)} · /p/{product.handle}</p><ul className="mt-2 space-y-2">{(product.variants ?? []).map((variant) => {
                const level = stock.find((item) => item.variant_id === variant.id)
                return <li key={variant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand-soft p-3"><span>{variant.title} · {level?.stocked_quantity ?? "No stock level"} stocked · {level?.reserved_quantity ?? 0} reserved</span>{variant.manage_inventory && <form action={updateVendorStock} className="flex items-center gap-2"><input type="hidden" name="variant_id" value={variant.id} /><label className="sr-only" htmlFor={`stock-${variant.id}`}>New stock for {product.title}</label><input id={`stock-${variant.id}`} name="stocked_quantity" type="number" min={level?.reserved_quantity ?? 0} max="100000" defaultValue={level?.stocked_quantity ?? 0} className="min-h-10 w-24 rounded-lg border border-muted px-2" /><button type="submit" className="min-h-10 rounded-lg border border-muted px-3">Update</button></form>}</li>
              })}</ul></article>)}</div> : <p className="mt-3 text-muted">You have not added any products yet.</p>}
            </section>
          </>}

          <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
            <h2 className="text-xl font-semibold">Orders</h2>
            {orders.length ? <ul className="mt-3 divide-y divide-sand">{orders.map((order) => <li key={order.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong>Order #{order.display_id} · {statusText(order.status)}</strong><span>{new Date(order.created_at).toLocaleDateString("en-US")} · {money(order.total, order.currency_code)}</span></div><p className="mt-1 text-sm text-muted">Customer: {order.email}</p><ul className="mt-2 list-inside list-disc text-sm">{order.items.map((item, index) => <li key={`${item.title}-${index}`}>{item.title} × {item.quantity}</li>)}</ul><p className="mt-2 text-xs text-muted">Order processing and delivery are simulated in this prototype.</p></li>)}</ul> : <p className="mt-3 text-muted">No orders yet.</p>}
          </section>
        </>
      ) : (
        <section className="mt-6 grid gap-5 rounded-2xl border border-sand bg-white p-5 md:grid-cols-2">
          <form action={loginVendor} className="space-y-3">
            <h2 className="text-xl font-semibold">Seller sign in</h2>
            <label className="block">Email<input name="email" type="email" required autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Password<input name="password" type="password" required minLength={4} maxLength={128} autoComplete="current-password" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Sign in</button>
          </form>
          <form action={registerVendor} className="space-y-3">
            <h2 className="text-xl font-semibold">Apply to sell</h2>
            <label className="block">Store name<input name="name" required maxLength={100} autoComplete="organization" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <div className="grid grid-cols-2 gap-3"><label>First name<input name="first_name" required autoComplete="given-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label><label>Last name<input name="last_name" required autoComplete="family-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label></div>
            <label className="block">Email<input name="email" type="email" required autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Password<input name="password" type="password" required minLength={4} maxLength={128} autoComplete="new-password" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <p className="text-sm text-muted">New stores are reviewed by the platform before products can be listed.</p>
            <button type="submit" className="min-h-11 rounded-xl border border-muted px-5">Submit application</button>
          </form>
        </section>
      )}
    </div>
  )
}
