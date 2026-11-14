import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { recordAudit } from "../../../modules/security/audit"
import MarketplaceModuleService from "../../../modules/marketplace/service"
import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import { getVendorContext } from "../guard"
import {
  CanadianShippingOriginSchema,
  shippingOriginToStockLocationAddress,
  shippingOriginToVendorFields,
} from "../shipping-origin-schema"

export const PatchVendorShippingOriginSchema = z
  .object({ shipping_origin: CanadianShippingOriginSchema })
  .strict()

type RequestBody = {
  shipping_origin: typeof CanadianShippingOriginSchema._output
}

const originFields = [
  "shipping_origin_address_1",
  "shipping_origin_city",
  "shipping_origin_province",
  "shipping_origin_postal_code",
  "shipping_origin_phone",
]

export const PATCH = async (req: AuthenticatedMedusaRequest<RequestBody>, res: MedusaResponse) => {
  const { vendorId, vendorAdminId } = getVendorContext(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [vendor],
  } = await query.graph({
    entity: "vendor",
    fields: ["id", "stock_location.id", ...originFields],
    filters: { id: vendorId },
  })
  if (!vendor) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Vendeur introuvable.")

  const marketplace: MarketplaceModuleService = req.scope.resolve(MARKETPLACE_MODULE)
  const nextFields = shippingOriginToVendorFields(req.validatedBody.shipping_origin)
  const previousFields = Object.fromEntries(originFields.map((field) => [field, vendor[field]]))
  await marketplace.updateVendors({ id: vendorId, ...nextFields })

  try {
    if (vendor.stock_location?.id) {
      const stockLocation: any = req.scope.resolve(Modules.STOCK_LOCATION)
      await stockLocation.updateStockLocations(vendor.stock_location.id, {
        address: shippingOriginToStockLocationAddress(req.validatedBody.shipping_origin),
      })
    }
  } catch (error) {
    await marketplace.updateVendors({ id: vendorId, ...previousFields } as any)
    throw error
  }

  const {
    data: [actor],
  } = await query.graph({
    entity: "vendor_admin",
    fields: ["id", "email"],
    filters: { id: vendorAdminId },
  })
  await recordAudit(req.scope, {
    action: "vendor.shipping_origin.updated",
    actor_type: "vendor",
    actor_id: vendorAdminId,
    actor_email: actor?.email ?? null,
    ip: req.ip ?? null,
    target_type: "vendor",
    target_id: vendorId,
  })

  res.json({ vendor: { id: vendorId, ...nextFields } })
}
