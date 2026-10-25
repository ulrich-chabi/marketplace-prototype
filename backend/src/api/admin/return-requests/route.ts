import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import MarketplaceModuleService from "../../../modules/marketplace/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// File de demandes de retour, réservée à la plateforme.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const service: MarketplaceModuleService = req.scope.resolve(MARKETPLACE_MODULE)
  const q = req.query as Record<string, string | undefined>
  const limit = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), 200)
  const offset = Math.max(Number(q.offset ?? 0) || 0, 0)
  const [requests, count] = await service.listAndCountReturnRequests(
    q.status ? { status: q.status as "pending" | "approved" | "rejected" } : {},
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  )
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderIds = [...new Set(requests.map((request) => request.parent_order_id))]
  const vendorIds = [...new Set(requests.map((request) => request.vendor_id))]
  const [{ data: orders }, { data: vendors }] = await Promise.all([
    orderIds.length ? query.graph({ entity: "order", fields: ["id", "display_id", "items.id", "items.title"], filters: { id: orderIds } }) : Promise.resolve({ data: [] }),
    vendorIds.length ? query.graph({ entity: "vendor", fields: ["id", "name"], filters: { id: vendorIds } }) : Promise.resolve({ data: [] }),
  ])
  const result = requests.map((request) => {
    const order = (orders as any[]).find((entry) => entry.id === request.parent_order_id)
    const item = (order?.items ?? []).find((entry: any) => entry.id === request.order_item_id)
    const vendor = (vendors as any[]).find((entry) => entry.id === request.vendor_id)
    return {
      id: request.id,
      parent_order_id: request.parent_order_id,
      vendor_order_id: request.vendor_order_id,
      order_display_id: order?.display_id,
      vendor_name: vendor?.name,
      item_title: item?.title,
      quantity: request.quantity,
      reason: request.reason,
      status: request.status,
      decision_note: request.decision_note,
      created_at: request.created_at,
    }
  })
  res.json({ return_requests: result, count, limit, offset })
}
