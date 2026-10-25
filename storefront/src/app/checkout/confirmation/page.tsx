import type { Metadata } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import { money } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Order confirmation" }

export default async function ConfirmationPage() {
  const value = (await cookies()).get("checkout_receipt")?.value
  let receipt: { order?: string | number; total?: number | null } = {}
  try { receipt = value ? JSON.parse(value) : {} } catch { /* receipt expired or malformed */ }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <section className="rounded-2xl border border-sand bg-white p-7">
        <h1 className="font-serif text-3xl">Demo order placed</h1>
        <p className="mt-3">Your simulated order was created. No payment was taken.</p>
        {receipt.order && <p className="mt-4"><strong>Order reference:</strong> {receipt.order}</p>}
        {typeof receipt.total === "number" && <p className="mt-1"><strong>Order total:</strong> {money(receipt.total)}</p>}
        <Link href="/search" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-terracotta px-5 text-white">Continue browsing</Link>
      </section>
    </div>
  )
}
