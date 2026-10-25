import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createHash, randomBytes } from "node:crypto"
import createVendorOrdersWorkflow from "../../../../../workflows/marketplace/create-vendor-orders"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createVendorOrdersWorkflow(req.scope).run({
    input: { cart_id: req.params.id },
  })
  const orderId = result.order.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "total", "metadata"],
    filters: { id: orderId },
  })
  const order = data[0] as any
  if (!order) throw new Error("Completed order could not be retrieved")

  // Code à forte entropie montré une seule fois au client; la base ne garde que son empreinte.
  const trackingCode = randomBytes(32).toString("base64url")
  const trackingHash = createHash("sha256").update(trackingCode).digest("hex")
  await req.scope.resolve(Modules.ORDER).updateOrders(orderId, {
    metadata: { ...(order.metadata ?? {}), guest_tracking_code_hash: trackingHash },
  })

  res.json({
    type: "order",
    order: { id: order.id, display_id: order.display_id, total: order.total },
    tracking_code: trackingCode,
    vendor_orders: result.vendorOrders,
  })
}
