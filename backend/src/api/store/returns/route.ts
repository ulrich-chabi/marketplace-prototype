import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createHash, timingSafeEqual } from "node:crypto"
import { z } from "@medusajs/framework/zod"
import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import MarketplaceModuleService from "../../../modules/marketplace/service"

export const PostReturnRequestSchema = z.object({
  order_id: z.string().min(7).max(100).startsWith("order_"),
  access_code: z.string().min(40).max(50),
  line_item_id: z.string().min(1).max(100),
  quantity: z.number().int().positive().max(10),
  reason: z.enum(["damaged", "wrong_item", "not_as_described", "no_longer_needed"]),
}).strict()

export const POST = async (
  req: MedusaRequest<z.infer<typeof PostReturnRequestSchema>>,
  res: MedusaResponse
) => {
  const { order_id, access_code, line_item_id, quantity, reason } = req.validatedBody
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "created_at", "metadata", "customer_id", "items.*"],
    filters: { id: order_id },
  })

  const storedHash = (order as any)?.metadata?.guest_tracking_code_hash
  const providedHash = createHash("sha256").update(access_code).digest("hex")
  const expected = typeof storedHash === "string" && /^[a-f0-9]{64}$/i.test(storedHash)
    ? Buffer.from(storedHash, "hex")
    : Buffer.alloc(0)
  const provided = Buffer.from(providedHash, "hex")
  if (!order || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  const item = ((order as any).items ?? []).find((line: any) => line.id === line_item_id)
  const productId = item?.product_id ?? item?.variant?.product_id
  if (!item || quantity > Number(item.quantity)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Return item not found")
  }
  let product: any
  if (productId) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "vendor.id", "vendor.return_window_days"],
      filters: { id: productId },
    })
    product = data[0]
  } else if (item.variant_id) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product.id", "product.vendor.id", "product.vendor.return_window_days"],
      filters: { id: item.variant_id },
    })
    product = (data[0] as any)?.product
  }
  const vendor = (product as any)?.vendor
  const days = Number(vendor?.return_window_days)
  const deadline = new Date(new Date((order as any).created_at).getTime() + days * 24 * 60 * 60 * 1000)
  if (!vendor?.id || !Number.isFinite(days) || days <= 0 || Date.now() > deadline.getTime()) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This item is outside its demo return window.")
  }

  const { data: [seller] } = await query.graph({
    entity: "vendor",
    fields: ["id", "orders.id"],
    filters: { id: vendor.id },
  })
  const sellerOrderIds = ((seller as any)?.orders ?? []).map((entry: any) => entry.id)
  const { data: sellerOrders } = sellerOrderIds.length ? await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: sellerOrderIds },
  }) : { data: [] }
  const vendorOrder = (sellerOrders as any[]).find((candidate) =>
    candidate.id === order_id || candidate.metadata?.parent_order_id === order_id
  )
  if (!vendorOrder) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")

  const service: MarketplaceModuleService = req.scope.resolve(MARKETPLACE_MODULE)
  const existing = await service.listReturnRequests({ order_item_id: line_item_id })
  const activeQuantity = existing
    .filter((request) => request.status === "pending" || request.status === "approved")
    .reduce((sum, request) => sum + Number(request.quantity), 0)
  if (activeQuantity + quantity > Number(item.quantity)) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The requested quantity is already under review.")
  }

  const request = await service.createReturnRequests({
    parent_order_id: order_id,
    vendor_order_id: vendorOrder.id,
    vendor_id: vendor.id,
    order_item_id: line_item_id,
    customer_id: (order as any).customer_id ?? null,
    quantity,
    reason,
  })
  res.status(201).json({ return_request: { id: request.id, status: request.status } })
}
