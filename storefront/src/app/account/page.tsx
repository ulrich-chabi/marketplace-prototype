import type { Metadata } from "next"
import { cookies } from "next/headers"
import { forgetTrackedOrder, loginCustomer, lookupOrder, logoutCustomer, registerCustomer, requestReturn, updateCustomerProfile } from "@/lib/actions"
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
  items: { id: string; title: string; quantity: number }[]
  return_requests?: { order_item_id: string; status: string }[]
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
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get("tracked_order")?.value
  const customerToken = cookieStore.get("customer_token")?.value
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

  let customer: { email: string; first_name?: string | null; last_name?: string | null } | null = null
  let orders: DemoOrder[] = []
  if (customerToken) {
    const headers = { Authorization: `Bearer ${customerToken}` }
    try {
      const response = await sdk.store.customer.retrieve({}, headers)
      customer = response.customer
      const orderResponse = await sdk.store.order.list({ fields: "id,display_id,created_at,status,fulfillment_status,payment_status,total,*items", limit: 50 }, headers)
      orders = orderResponse.orders as unknown as DemoOrder[]
    } catch {
      customer = null
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl">Your account</h1>
      <p className="mt-3 text-muted">Manage your demo customer profile and orders. Payments and fulfillment remain simulated.</p>

      {params.error && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">We could not complete that account request. Check your details and try again.</p>}
      {params.saved === "1" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Your profile was updated.</p>}
      {params.return === "sent" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Your return request was sent to the platform for review. Approval does not issue an automatic refund.</p>}

      {customer ? (
        <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-semibold">Welcome, {customer.first_name || customer.email}</h2><p className="mt-1 text-sm text-muted">{customer.email}</p></div>
            <form action={logoutCustomer}><button type="submit" className="min-h-11 rounded-xl border border-muted px-4">Sign out</button></form>
          </div>
          <form action={updateCustomerProfile} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label>First name<input name="first_name" required defaultValue={customer.first_name ?? ""} autoComplete="given-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label>Last name<input name="last_name" required defaultValue={customer.last_name ?? ""} autoComplete="family-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white sm:col-span-2">Save profile</button>
          </form>
          <h2 className="mt-8 text-xl font-semibold">Order history</h2>
          {orders.length ? <ul className="mt-3 divide-y divide-sand">{orders.map((item) => <li key={item.display_id} className="flex flex-wrap justify-between gap-2 py-3"><span>Order #{item.display_id} · {label(item.status)}</span><span>{new Date(item.created_at).toLocaleDateString("en-US")} · {money(item.total)}</span></li>)}</ul> : <p className="mt-2 text-muted">No account orders yet. Orders placed after sign-in will appear here.</p>}
        </section>
      ) : (
        <section className="mt-6 grid gap-5 rounded-2xl border border-sand bg-white p-5 md:grid-cols-2">
          <form action={loginCustomer} className="space-y-3">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <label className="block">Email<input name="email" type="email" required autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Password<input name="password" type="password" required minLength={4} maxLength={128} autoComplete="current-password" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Sign in</button>
          </form>
          <form action={registerCustomer} className="space-y-3">
            <h2 className="text-xl font-semibold">Create an account</h2>
            <div className="grid grid-cols-2 gap-3"><label>First name<input name="first_name" required autoComplete="given-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label><label>Last name<input name="last_name" required autoComplete="family-name" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label></div>
            <label className="block">Email<input name="email" type="email" required autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Password<input name="password" type="password" required minLength={4} maxLength={128} autoComplete="new-password" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <button type="submit" className="min-h-11 rounded-xl border border-muted px-5">Create account</button>
          </form>
        </section>
      )}

      {params.error === "lookup" && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">We could not find that order. Check the reference and private access code.</p>}

      <h2 className="mt-8 text-2xl font-semibold">Guest order tracking</h2>
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
          <ul className="mt-2 space-y-3">
            {order.items.map((item, index) => {
              const requests = order.return_requests?.filter((request) => request.order_item_id === item.id) ?? []
              const active = requests.some((request) => request.status === "pending" || request.status === "approved")
              return <li key={`${item.id}-${index}`} className="border-b border-sand py-3"><div>{item.title} × {item.quantity}</div>{requests.map((request, requestIndex) => <p key={`${request.status}-${requestIndex}`} className="mt-2 text-sm text-muted">Return request: {label(request.status)}{request.status === "approved" && " · Refunds are handled separately by the platform."}</p>)}{!active && <form action={requestReturn} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="line_item_id" value={item.id} /><label className="text-sm">Qty<input name="quantity" type="number" min={1} max={Math.min(item.quantity, 10)} defaultValue={1} required className="ml-2 min-h-10 w-20 rounded-lg border border-muted px-2" /></label><label className="text-sm">Reason<select name="reason" defaultValue="damaged" className="ml-2 min-h-10 rounded-lg border border-muted px-2"><option value="damaged">Damaged</option><option value="wrong_item">Wrong item</option><option value="not_as_described">Not as described</option><option value="no_longer_needed">No longer needed</option></select></label><button type="submit" className="min-h-10 rounded-lg border border-muted px-3">Request return</button></form>}</li>
            })}
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
