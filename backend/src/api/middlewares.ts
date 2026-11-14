import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { PostVendorStatusSchema } from "./admin/vendors/[id]/status/route"
import { PostVendorOrderRefundSchema } from "./admin/vendor-orders/[id]/refund/route"
import { loginRateLimit, enforcePasswordPolicy } from "./auth-security"
import { ensureActiveVendor, ensureReadableVendor, ensureRegisteredVendor } from "./vendors/guard"
import { PostVendorCreateSchema } from "./vendors/route"
import { PatchVendorShippingOriginSchema } from "./vendors/shipping-origin/route"
import { PostVendorProductSchema } from "./vendors/products/route"
import { PostVendorStockSchema } from "./vendors/stock/route"
import { PostOrderTrackingSchema } from "./store/order-tracking/route"
import { PostReturnRequestSchema } from "./store/marketplace-returns/route"
import { PostReturnDecisionSchema } from "./admin/return-requests/[id]/route"
import { Modules } from "@medusajs/framework/utils"
import { isAvalaraProductionConfigured, isProductionCheckoutReady } from "./store/carts/checkout-readiness"

async function protectProductionPaymentSession(req: any, res: any, next: any) {
  if (process.env.NODE_ENV !== "production") return next()

  const taxRegions = await req.scope.resolve(Modules.TAX).listTaxRegions({ country_code: "ca" })
  const taxProviderId = taxRegions.find((region: any) => !region.province_code)?.provider_id
  const isReady = isProductionCheckoutReady({
    paymentProviderId: req.body?.provider_id,
    taxProviderId,
    stripeConfigured: Boolean(process.env.STRIPE_API_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    avalaraProductionConfigured: isAvalaraProductionConfigured(),
    taxCatalogVerified: process.env.AVALARA_TAX_CATALOG_VERIFIED === "true",
    sendgridConfigured: Boolean(
      process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM &&
      process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID && process.env.STOREFRONT_PUBLIC_URL
    ),
  })
  if (!isReady) {
    return res.status(503).json({
      type: "checkout_unavailable",
      message: "Checkout is disabled in production until payment, tax and order email providers are configured.",
    })
  }
  return next()
}

export default defineMiddlewares({
  routes: [
    // Empêche la création d'une intention Stripe réelle avant que le checkout
    // final puisse accepter la commande (taxes et courriel inclus).
    {
      matcher: "/store/payment-collections/:id/payment-sessions",
      method: ["POST"],
      middlewares: [protectProductionPaymentSession],
    },
    // Inscription : identité authentifiée mais pas encore rattachée à un vendeur.
    {
      matcher: "/vendors",
      method: ["POST"],
      middlewares: [
        authenticate("vendor", ["session", "bearer"], { allowUnregistered: true }),
        validateAndTransformBody(PostVendorCreateSchema),
      ],
    },
    {
      matcher: "/vendors/shipping-origin",
      method: ["PATCH"],
      middlewares: [
        authenticate("vendor", ["session", "bearer"]),
        ensureRegisteredVendor,
        validateAndTransformBody(PatchVendorShippingOriginSchema),
      ],
    },
    {
      matcher: "/vendors",
      method: ["GET"],
      middlewares: [authenticate("vendor", ["session", "bearer"]), ensureRegisteredVendor],
    },
    // Authentification : limitation des tentatives et longueur minimale du mot de passe.
    { matcher: "/auth/:actor_type/:auth_provider", method: ["POST"], middlewares: [loginRateLimit] },
    {
      matcher: "/auth/:actor_type/:auth_provider/register",
      method: ["POST"],
      middlewares: [enforcePasswordPolicy],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/update",
      method: ["POST"],
      middlewares: [enforcePasswordPolicy],
    },
    // Toutes les routes vendeur : identité vendeur, actif ou suspendu (lecture).
    {
      matcher: "/vendors/*",
      middlewares: [authenticate("vendor", ["session", "bearer"]), ensureReadableVendor],
    },
    // Catalogue et stock : vendeur actif uniquement (lecture comprise).
    { matcher: "/vendors/products", middlewares: [ensureActiveVendor] },
    { matcher: "/vendors/stock", middlewares: [ensureActiveVendor] },
    {
      matcher: "/vendors/products",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostVendorProductSchema)],
    },
    {
      matcher: "/vendors/stock",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostVendorStockSchema)],
    },
    {
      matcher: "/admin/vendors/:id/status",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostVendorStatusSchema)],
    },
    {
      matcher: "/admin/vendor-orders/:id/refund",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostVendorOrderRefundSchema)],
    },
    {
      matcher: "/store/order-tracking",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostOrderTrackingSchema)],
    },
    {
      matcher: "/store/marketplace-returns",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostReturnRequestSchema)],
    },
    {
      matcher: "/admin/return-requests/:id",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostReturnDecisionSchema)],
    },
  ],
})
