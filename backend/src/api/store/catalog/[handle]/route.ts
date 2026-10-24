import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { loadCatalog } from "../../../../modules/catalog/listing"

// Fiche détaillée : toutes les offres visibles d'une fiche catalogue, avec le
// stock disponible de chaque offre et le tarif de livraison standard.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Filtre direct sur l'identifiant : ne dépend ni de l'ordre ni de la pagination.
  const { cards } = await loadCatalog(req.scope, { handle: req.params.handle, limit: 1 })
  const card = cards[0]
  if (!card) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Produit introuvable.")

  const query: any = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Stock disponible = stocké - réservé, tous emplacements confondus ; null si non géré.
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id", "manage_inventory",
      "inventory_items.inventory.location_levels.stocked_quantity",
      "inventory_items.inventory.location_levels.reserved_quantity",
    ],
    filters: { id: card.offers.map((o) => o.variant_id) },
  })
  const availability = new Map<string, number | null>()
  for (const v of variants as any[]) {
    if (!v.manage_inventory) {
      availability.set(v.id, null)
      continue
    }
    let total = 0
    for (const item of v.inventory_items ?? [])
      for (const l of item.inventory?.location_levels ?? [])
        total += Number(l.stocked_quantity) - Number(l.reserved_quantity)
    availability.set(v.id, Math.max(total, 0))
  }
  const offers = card.offers.map((o) => ({ ...o, available: availability.get(o.variant_id) ?? null }))

  // Livraison : tarif forfaitaire de l'option « Standard » (simulée).
  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "prices.amount", "prices.currency_code"],
    filters: { name: "Standard" },
  })
  const price = (options[0]?.prices ?? []).find((p: any) => p.currency_code === card.currency_code)
  const shipping = price
    ? { name: options[0].name as string, price: Number(price.amount), currency_code: card.currency_code }
    : null

  res.json({ product: { ...card, offers }, shipping })
}
