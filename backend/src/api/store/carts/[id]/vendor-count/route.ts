import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

// Expose seulement le nombre de vendeurs, calculé depuis les liens produits
// réels plutôt que depuis les métadonnées modifiables du panier.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "items.product.vendor.id", "items.product.vendor.status"],
    filters: { id: req.params.id },
  })
  const cart = data[0] as any
  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  const vendors = new Map<string, string>()
  for (const item of cart.items ?? []) {
    const vendor = item.product?.vendor
    if (!vendor?.id || vendor.status !== "active") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "A seller in this cart is unavailable")
    }
    vendors.set(vendor.id, vendor.status)
  }

  res.json({ vendor_count: vendors.size })
}
