import type { Metadata } from "next"
import { cookies } from "next/headers"
import { forgetTrackedOrder, lookupOrder } from "@/lib/actions"
import { money } from "@/lib/format"
import { sdk } from "@/lib/medusa"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Account" }

type DemoOrder = {
  display_id: number
  created_at: string
  status: string
  fulfillment_status: string
  payment_status: string
  total: number
  items: { title: string; quantity: number }[]
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const cookieValue = (await cookies()).get("tracked_order")?.value
  let saved: { order_id?: string; access_code?: string } = {}
  try { saved = cookieValue ? JSON.parse(cookieValue) : {} } catch { /* ignore invalid saved value */ }

  let order: DemoOrder | null = null
  if (saved.order_id && saved.access_code) {
    try {
      const response = await sdk.client.fetch<{ order: DemoOrder }>("/store/order-tracking", {
        method: "POST",
        body: { order_id: saved.order_id, access_code: saved.access_code },
      })
      order = response.order
    } catch { /* deleted or unavailable order */ }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl">Account and demo orders</h1>
      <p className="mt-3 text-muted">Look up a demo order with its reference and private access code. No account or real personal information is used.</p>

      {params.error === "lookup" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">We could not find that order. Check the reference and private access code.</p>}

      {order ? (
        <section className="mt-6 rounded-2xl border border-sand bg-white p-5" aria-labelledby="order-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="order-heading" className="text-xl font-semibold">Your demo order #{order.display_id}</h2>
              <p className="mt-1 text-sm text-muted">Placed {new Date(order.created_at).toLocaleDateString("en-US")}</p>
            </div>
            <form action={forgetTrackedOrder}><button type="submit" className="min-h-11 rounded-xl border border-muted px-4">Forget this order</button></form>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-sand-soft p-3"><dt className="text-sm text-muted">Order status</dt><dd className="font-semibold">{label(order.status)}</dd></div>
            <div className="rounded-xl bg-sand-soft p-3"><dt className="text-sm text-muted">Shipping status</dt><dd className="font-semibold">{label(order.fulfillment_status)}</dd></div>
            <div className="rounded-xl bg-sand-soft p-3"><dt className="text-sm text-muted">Payment status</dt><dd className="font-semibold">Simulated · {label(order.payment_status)}</dd></div>
          </dl>
          <h3 className="mt-5 font-semibold">Items</h3>
          <ul className="mt-2 space-y-2">
            {order.items.map((item, index) => <li key={`${item.title}-${index}`} className="flex justify-between gap-4 border-b border-sand py-2"><span>{item.title} × {item.quantity}</span></li>)}
          </ul>
          <p className="mt-4 flex justify-between text-lg"><span>Total</span><strong>{money(order.total)}</strong></p>
          <p className="mt-3 text-sm text-muted">Fulfillment is simulated. This page does not show a live carrier location.</p>
        </section>
      ) : (
        <p className="mt-5 rounded-2xl border border-sand bg-white p-5">No order is saved in this browser yet. Enter the order reference and access code from your confirmation.</p>
      )}

      <form action={lookupOrder} className="mt-6 space-y-4 rounded-2xl border border-sand bg-white p-5">
        <h2 className="text-xl font-semibold">Track a demo order</h2>
        <label className="block">Order reference<input name="order_id" type="text" placeholder="order_…" minLength={7} maxLength={100} required autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
        <label className="block">Private access code<input name="access_code" type="password" minLength={40} maxLength={50} required autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
        <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Find order</button>
      </form>
    </div>
  )
}
