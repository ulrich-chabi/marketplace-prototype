import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import MarketplaceModuleService from "../../../modules/marketplace/service"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: vendors } = await query.graph({ entity: "vendor", fields: ["orders.id"] })
  const ids = [...new Set((vendors as any[]).flatMap((vendor) => (vendor.orders ?? []).map((order: any) => order.id)).filter(Boolean))]
  if (!ids.length) return res.json({ orders: [] })
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "status", "email", "currency_code", "total", "metadata", "created_at", "items.*", "vendor.id", "vendor.name"],
    filters: { id: ids },
  })
  const parentIds = [...new Set((orders as any[]).map((order) => order.metadata?.parent_order_id ?? order.id))]
  const { data: parents } = parentIds.length ? await query.graph({
    entity: "order",
    fields: ["id", "payment_collections.payments.id", "payment_collections.payments.captured_at"],
    filters: { id: parentIds },
  }) : { data: [] }
  const marketplace: MarketplaceModuleService = req.scope.resolve(MARKETPLACE_MODULE)
  const enriched = await Promise.all((orders as any[]).map(async (order) => {
    const refunds = await marketplace.listVendorRefunds({ vendor_order_id: order.id })
    const refunded = refunds.reduce((sum, refund) => sum + Number((refund.amount as any)?.numeric ?? refund.amount), 0)
    const total = Number((order.total as any)?.numeric ?? order.total)
    const parentId = order.metadata?.parent_order_id ?? order.id
    const parent = (parents as any[]).find((candidate) => candidate.id === parentId)
    const payments = (parent?.payment_collections ?? []).flatMap((collection: any) => collection.payments ?? [])
    const captured = payments.find((payment: any) => payment.captured_at)
    return {
      ...order,
      payment_captured: Boolean(captured),
      payment_id: captured?.id ?? payments[0]?.id ?? null,
      refunded_total: refunded,
      remaining_refundable: Math.max(0, total - refunded),
    }
  }))
  res.json({ orders: enriched })
}
