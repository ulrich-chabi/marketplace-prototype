import type { Metadata } from "next"
import { cookies } from "next/headers"
import { captureDemoPayment, decideReturnRequest, loginPlatformAdmin, logoutPlatformAdmin, refundVendorOrder, setVendorStatus } from "@/lib/actions"
import { money } from "@/lib/format"
import { BACKEND_URL, sdk } from "@/lib/medusa"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Platform operations" }

type Vendor = { id: string; name: string; handle: string; status: string; created_at: string }
type VendorOrder = { id: string; display_id: number; status: string; email: string; currency_code: string; total: number; created_at: string; items: { title: string; quantity: number }[]; payment_captured: boolean; payment_id?: string | null; refunded_total: number; remaining_refundable: number; vendor?: { name?: string } }
type ReturnRequest = { id: string; parent_order_id: string; vendor_order_id: string; order_display_id?: number; vendor_name?: string; item_title?: string; quantity: number; reason: string; created_at: string }
type AuditEvent = { id: string; action: string; actor_type?: string; target_type?: string; target_id?: string; created_at: string }

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function PlatformPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const token = (await cookies()).get("platform_token")?.value
  let vendors: Vendor[] = []
  let orders: VendorOrder[] = []
  let returns: ReturnRequest[] = []
  let events: AuditEvent[] = []
  let authenticated = false
  let loadError = false
  if (token) {
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [vendorResponse, orderResponse, returnResponse, auditResponse] = await Promise.all([
        sdk.client.fetch<{ vendors: Vendor[] }>("/admin/vendors", { headers }),
        sdk.client.fetch<{ orders: VendorOrder[] }>("/admin/vendor-orders", { headers }),
        sdk.client.fetch<{ return_requests: ReturnRequest[] }>("/admin/return-requests?status=pending", { headers }),
        sdk.client.fetch<{ events: AuditEvent[] }>("/admin/audit-events?limit=20", { headers }),
      ])
      authenticated = true
      vendors = vendorResponse.vendors
      orders = orderResponse.orders
      returns = returnResponse.return_requests
      events = auditResponse.events
    } catch {
      loadError = true
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-3xl">Platform operations</h1>
      <p className="mt-3 text-muted">Manage seller access, demo returns and simulated payments. Actions are recorded in the audit log.</p>
      {params.error && <p role="alert" className="mt-4 rounded-xl border border-terracotta bg-white p-4">That platform action did not complete. Check the current status and try again.</p>}
      {params.status === "updated" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Seller status updated.</p>}
      {params.return === "updated" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Return request decided.</p>}
      {params.capture === "sent" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Demo payment captured.</p>}
      {params.refund === "sent" && <p role="status" className="mt-4 rounded-xl border border-sand bg-white p-4">Demo refund recorded.</p>}

      {!authenticated ? (
        <section className="mt-6 max-w-md rounded-2xl border border-sand bg-white p-5">
          {loadError && <p role="alert" className="mb-3">The admin session expired or the platform service is unavailable. Sign in again.</p>}
          <form action={loginPlatformAdmin} className="space-y-3">
            <h2 className="text-xl font-semibold">Administrator sign in</h2>
            <label className="block">Email<input name="email" type="email" required autoComplete="username" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <label className="block">Password<input name="password" type="password" required minLength={4} maxLength={128} autoComplete="current-password" className="mt-1 min-h-11 w-full rounded-xl border border-muted px-3" /></label>
            <button type="submit" className="min-h-11 rounded-xl bg-terracotta px-5 text-white">Sign in</button>
          </form>
        </section>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-3"><form action={logoutPlatformAdmin}><button type="submit" className="min-h-11 rounded-xl border border-muted bg-white px-4">Sign out</button></form><a href={`${BACKEND_URL}/app`} className="inline-flex min-h-11 items-center rounded-xl border border-muted bg-white px-4">Open Medusa admin</a></div>
          <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
            <h2 className="text-xl font-semibold">Seller applications and access</h2>
            {vendors.length ? <div className="mt-3 divide-y divide-sand">{vendors.map((vendor) => <article key={vendor.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><h3 className="font-semibold">{vendor.name}</h3><p className="text-sm text-muted">{vendor.handle} · {label(vendor.status)} · applied {new Date(vendor.created_at).toLocaleDateString("en-US")}</p></div>{vendor.status !== "pending" && <form action={setVendorStatus}><input type="hidden" name="vendor_id" value={vendor.id} /><input type="hidden" name="status" value={vendor.status === "active" ? "suspended" : "active"} /><button type="submit" className="min-h-10 rounded-lg border border-muted px-3">{vendor.status === "active" ? "Suspend" : "Reactivate"}</button></form>}{vendor.status === "pending" && <form action={setVendorStatus}><input type="hidden" name="vendor_id" value={vendor.id} /><input type="hidden" name="status" value="active" /><button type="submit" className="min-h-10 rounded-lg bg-terracotta px-3 text-white">Approve seller</button></form>}</article>)}</div> : <p className="mt-3 text-muted">No seller applications yet.</p>}
          </section>

          <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
            <h2 className="text-xl font-semibold">Return requests awaiting review</h2>
            {returns.length ? <ul className="mt-3 divide-y divide-sand">{returns.map((request) => <li key={request.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong>{request.vendor_name ?? "Seller"} · Order #{request.order_display_id ?? "—"}</strong><span>{label(request.reason)} · Qty {request.quantity}</span></div><p className="mt-1 text-sm text-muted">{request.item_title ?? request.vendor_order_id} · {new Date(request.created_at).toLocaleDateString("en-US")}</p><div className="mt-3 flex flex-wrap gap-2"><form action={decideReturnRequest}><input type="hidden" name="request_id" value={request.id} /><input type="hidden" name="status" value="approved" /><input type="hidden" name="decision_note" value="request_approved" /><button type="submit" className="min-h-10 rounded-lg bg-terracotta px-3 text-white">Approve request</button></form><form action={decideReturnRequest} className="flex items-center gap-2"><input type="hidden" name="request_id" value={request.id} /><input type="hidden" name="status" value="rejected" /><label className="sr-only" htmlFor={`return-note-${request.id}`}>Rejection reason</label><select id={`return-note-${request.id}`} name="decision_note" className="min-h-10 rounded-lg border border-muted px-2"><option value="outside_return_policy">Outside return policy</option><option value="insufficient_information">Insufficient information</option></select><button type="submit" className="min-h-10 rounded-lg border border-muted px-3">Reject</button></form></div></li>)}</ul> : <p className="mt-3 text-muted">No pending return requests.</p>}
          </section>

          <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
            <h2 className="text-xl font-semibold">Seller orders and demo payments</h2>
            {orders.length ? <ul className="mt-3 divide-y divide-sand">{orders.map((order) => <li key={order.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong>{order.vendor?.name ?? "Seller"} · Order #{order.display_id}</strong><span>{label(order.status)} · {money(order.total, order.currency_code)}</span></div><p className="mt-1 text-sm text-muted">Customer: {order.email} · {new Date(order.created_at).toLocaleDateString("en-US")}</p><ul className="mt-2 list-inside list-disc text-sm">{order.items.map((item, index) => <li key={`${item.title}-${index}`}>{item.title} × {item.quantity}</li>)}</ul><p className="mt-2 text-sm">Refunded: {money(order.refunded_total, order.currency_code)} · Remaining: {money(order.remaining_refundable, order.currency_code)}</p>{!order.payment_captured && order.payment_id && <form action={captureDemoPayment} className="mt-3"><input type="hidden" name="payment_id" value={order.payment_id} /><button type="submit" className="min-h-10 rounded-lg border border-muted px-3">Capture demo payment</button></form>}{order.payment_captured && order.remaining_refundable > 0 && <form action={refundVendorOrder} className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="vendor_order_id" value={order.id} /><label>Refund amount<input name="amount" type="number" min="0.01" max={order.remaining_refundable} step="0.01" required className="mt-1 min-h-10 w-36 rounded-lg border border-muted px-2" /></label><label>Reason<select name="reason" className="mt-1 min-h-10 rounded-lg border border-muted px-2"><option value="approved_return">Approved return</option><option value="order_issue">Order issue</option><option value="demo_adjustment">Demo adjustment</option></select></label><button type="submit" className="min-h-10 rounded-lg border border-muted px-3">Issue demo refund</button></form>}</li>)}</ul> : <p className="mt-3 text-muted">No seller orders yet.</p>}
          </section>

          <section className="mt-6 rounded-2xl border border-sand bg-white p-5">
            <h2 className="text-xl font-semibold">Recent audit activity</h2>
            {events.length ? <ul className="mt-3 divide-y divide-sand">{events.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{label(event.action)} · {event.target_type} {event.target_id}</span><span className="text-sm text-muted">{new Date(event.created_at).toLocaleString("en-US")}</span></li>)}</ul> : <p className="mt-3 text-muted">No audit events recorded yet.</p>}
          </section>
        </>
      )}
    </div>
  )
}
