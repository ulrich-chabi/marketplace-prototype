import type { Metadata } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import { money } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Order confirmation" }

export default async function ConfirmationPage() {
  const value = (await cookies()).get("checkout_receipt")?.value
  let receipt: { order?: string | number; orderNumber?: number; total?: number | null; trackingCode?: string } = {}
  try { receipt = value ? JSON.parse(value) : {} } catch { /* receipt expired or malformed */ }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <section className="rounded-2xl border border-sand bg-white p-7">
        <h1 className="font-serif text-3xl">Demo order placed</h1>
        <p className="mt-3">Your simulated order was created. No payment was taken.</p>
        {receipt.order && <p className="mt-4"><strong>Order reference:</strong> {receipt.order}</p>}
        {receipt.orderNumber != null && <p className="mt-1"><strong>Order number:</strong> #{receipt.orderNumber}</p>}
        {typeof receipt.total === "number" && <p className="mt-1"><strong>Order total:</strong> {money(receipt.total)}</p>}
        {receipt.trackingCode && (
          <div className="mt-5 rounded-xl border border-sand bg-sand-soft p-4">
            <h2 className="font-semibold">Save this private order access code</h2>
            <code className="mt-2 block break-all rounded-lg bg-white p-3 text-sm">{receipt.trackingCode}</code>
            <p className="mt-2 text-sm text-muted">You will need this code with the order reference to check the order from another device. It is saved in this browser for convenience.</p>
          </div>
        )}
        <Link href="/account" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-muted px-5">View order status</Link>
        <Link href="/search" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-terracotta px-5 text-white">Continue browsing</Link>
      </section>
    </div>
  )
}
