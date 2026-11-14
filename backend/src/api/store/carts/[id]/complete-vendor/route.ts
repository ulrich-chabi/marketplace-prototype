import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createHash, randomBytes } from "node:crypto"
import createVendorOrdersWorkflow from "../../../../../workflows/marketplace/create-vendor-orders"
import { isAvalaraProductionConfigured, isProductionCheckoutReady, isStoreShippingReady } from "../../checkout-readiness"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (process.env.NODE_ENV === "production") {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [cart] } = await query.graph({
      entity: "cart",
      fields: ["shipping_address.country_code", "payment_collection.payment_sessions.provider_id"],
      filters: { id: req.params.id },
    })
    const providerId = cart?.payment_collection?.payment_sessions?.[0]?.provider_id
    const taxRegions = await req.scope.resolve(Modules.TAX).listTaxRegions({
      country_code: cart?.shipping_address?.country_code ?? "ca",
    })
    const taxProviderId = taxRegions.find((region: any) => !region.province_code)?.provider_id
    if (!isProductionCheckoutReady({
      paymentProviderId: providerId,
      taxProviderId,
      stripeConfigured: Boolean(process.env.STRIPE_API_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      avalaraProductionConfigured: isAvalaraProductionConfigured(),
      taxCatalogVerified: process.env.AVALARA_TAX_CATALOG_VERIFIED === "true",
      shippingConfigured: await isStoreShippingReady(req.scope.resolve(Modules.FULFILLMENT)),
      sendgridConfigured: Boolean(
        process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM &&
        process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID && process.env.STOREFRONT_PUBLIC_URL
      ),
    })) {
      return res.status(503).json({
        type: "checkout_unavailable",
        message: "Checkout is disabled in production until payment, Canadian tax, ShipStation shipping and order email providers are configured.",
      })
    }
  }

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

  // L'envoi est asynchrone et ne doit pas transformer une commande finalisée en erreur.
  try {
    await req.scope.resolve(Modules.EVENT_BUS).emit({
      name: "marketplace.order.completed",
      data: { id: order.id },
    })
  } catch (error) {
    req.scope.resolve("logger").warn(`Confirmation email enqueue failed for order ${order.id}`)
  }

  res.json({
    type: "order",
    order: { id: order.id, display_id: order.display_id, total: order.total },
    tracking_code: trackingCode,
    vendor_orders: result.vendorOrders,
  })
}
