import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createHash, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import MarketplaceModuleService from "../../../modules/marketplace/service"

export const PostOrderTrackingSchema = z.object({
  order_id: z.string().min(7).max(100).startsWith("order_"),
  access_code: z.string().min(40).max(50),
})

export async function POST(
  req: MedusaRequest<z.infer<typeof PostOrderTrackingSchema>>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "created_at", "status", "fulfillment_status",
      "payment_status", "total", "items.id", "items.title", "items.quantity", "metadata",
    ],
    filters: { id: req.validatedBody.order_id },
  })
  const order = data[0] as any
  const storedHash = order?.metadata?.guest_tracking_code_hash
  if (!order || typeof storedHash !== "string") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  const providedHash = createHash("sha256").update(req.validatedBody.access_code).digest("hex")
  const expected = Buffer.from(storedHash, "hex")
  const provided = Buffer.from(providedHash, "hex")
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  const marketplace: MarketplaceModuleService = req.scope.resolve(MARKETPLACE_MODULE)
  const returnRequests = await marketplace.listReturnRequests({ parent_order_id: order.id })

  // Ne renvoie aucune coordonnée client ni adresse.
  res.json({
    order: {
      display_id: order.display_id,
      created_at: order.created_at,
      status: order.status,
      fulfillment_status: order.fulfillment_status,
      payment_status: order.payment_status,
      total: order.total,
      items: (order.items ?? []).map((item: any) => ({ id: item.id, title: item.title, quantity: item.quantity })),
      return_requests: returnRequests.map((request) => ({ order_item_id: request.order_item_id, status: request.status })),
    },
  })
}
