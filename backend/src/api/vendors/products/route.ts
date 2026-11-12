import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { AdminCreateProduct } from "@medusajs/medusa/api/admin/products/validators"
import { CATALOG_MODULE } from "../../../modules/catalog"
import createVendorProductWorkflow from "../../../workflows/marketplace/create-vendor-product"
import { getVendorContext } from "../guard"

export const PostVendorProductSchema = z.intersection(
  AdminCreateProduct(),
  z.object({ catalog_handle: z.string().trim().min(1).max(200).optional() })
)

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { vendorId } = getVendorContext(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [vendor],
  } = await query.graph({
    entity: "vendor",
    fields: ["products.*", "products.variants.*"],
    filters: { id: vendorId },
  })

  res.json({ products: vendor?.products ?? [] })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminCreateProduct & { catalog_handle?: string }>,
  res: MedusaResponse
) => {
  const { vendorId } = getVendorContext(req)
  const { catalog_handle, ...requestedProduct } = req.validatedBody as any
  let catalogProductId: string | undefined
  let product = requestedProduct

  if (catalog_handle) {
    const catalogService: any = req.scope.resolve(CATALOG_MODULE)
    const [catalogProduct] = await catalogService.listCatalogProducts({ handle: catalog_handle }, { take: 1 })
    if (!catalogProduct) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Fiche catalogue introuvable.")
    if (typeof catalogProduct.attributes?.image_key !== "string" || !catalogProduct.attributes.image_key) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cette fiche catalogue doit avoir une photo avant sa mise en vente.")
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [linkedCatalogProduct] } = await query.graph({
      entity: "catalog_product",
      fields: ["products.vendor.id"],
      filters: { id: catalogProduct.id },
    })
    if (linkedCatalogProduct?.products?.some((offer: any) => offer.vendor?.id === vendorId)) {
      return res.status(409).json({ type: "duplicate_offer", message: "Votre boutique propose déjà cette fiche." })
    }

    catalogProductId = catalogProduct.id
    product = {
      ...requestedProduct,
      title: catalogProduct.title,
      description: catalogProduct.description ?? requestedProduct.description,
      handle: `${catalogProduct.handle.slice(0, 150)}-offer-${vendorId.slice(-10).toLowerCase()}`,
      metadata: { ...(requestedProduct.metadata ?? {}), catalog_handle: catalogProduct.handle, condition: "new" },
    }
  }

  const { result } = await createVendorProductWorkflow(req.scope).run({
    input: { vendor_id: vendorId, catalog_product_id: catalogProductId, product },
  })
  res.status(201).json({ product: result.product })
}
