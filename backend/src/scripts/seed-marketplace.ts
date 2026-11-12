import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../modules/marketplace"
import { CATALOG_MODULE } from "../modules/catalog"
import setVendorStatusWorkflow from "../workflows/marketplace/set-vendor-status"
import { BRANDS, COLORS, DEPARTMENTS, rng, VENDORS } from "./seed-data"
import { configureCanadianDemoTaxes } from "./canadian-demo-tax"

// Remplit une boutique canadienne avec des données fictives pour le prototype.
// Ne pas exécuter sur une boutique en production ou contenant des données réelles.
//   npm run seed:demo
// Variable : SEED_PRODUCTS_PER_CATEGORY (20 par défaut).
export default async function seedMarketplace({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const catalogService: any = container.resolve(CATALOG_MODULE)
  const marketplace: any = container.resolve(MARKETPLACE_MODULE)
  const perCategory = Math.max(1, Math.min(12, Number(process.env.SEED_PRODUCTS_PER_CATEGORY ?? 5)))

  const hasCatalog = (await catalogService.listCatalogProducts({}, { take: 1 })).length > 0

  // ---------- Boutique : devise, canal de vente, région, livraison ----------
  logger.info("Boutique de démonstration : Canada, CAD, estimations fiscales provinciales et livraison simulées…")
  const storeModule = container.resolve(Modules.STORE)
  const store = (await storeModule.listStores())[0]
  let salesChannelId = store.default_sales_channel_id as string | null
  if (!salesChannelId) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
    })
    salesChannelId = result[0].id
  }
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "cad", is_default: true }],
        default_sales_channel_id: salesChannelId,
      },
    },
  })

  let regionId: string
  const regions = await container.resolve(Modules.REGION).listRegions({ currency_code: "cad" })
  if (regions[0]) regionId = regions[0].id
  else {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          { name: "Canada", currency_code: "cad", countries: ["ca"], payment_providers: ["pp_system_default"] },
        ],
      },
    })
    regionId = result[0].id
  }
  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: regionId },
      update: { payment_providers: ["pp_system_default"] },
    },
  })
  await configureCanadianDemoTaxes(container)

  const fulfillment = container.resolve(Modules.FULFILLMENT)
  let profile = (await fulfillment.listShippingProfiles({ type: "default" }))[0]
  if (!profile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    profile = result[0]
  }

  const existingOptions = await fulfillment.listShippingOptions({ name: "Standard" })
  if (!existingOptions[0]) {
    const { result: locs } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: "Platform Warehouse", address: { city: "Toronto", country_code: "CA", address_1: "" } }] },
    })
    const location = locs[0]
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [salesChannelId] },
    })
    const set = await fulfillment.createFulfillmentSets({
      name: "Canada delivery",
      type: "shipping",
      service_zones: [{ name: "Canada", geo_zones: [{ country_code: "ca", type: "country" }] }],
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
    })
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: set.service_zones[0].id,
          shipping_profile_id: profile.id,
          type: { label: "Standard", description: "Demo shipping", code: "standard" },
          prices: [{ currency_code: "cad", amount: 5 }],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
  }

  // Clé publique de la boutique (nécessaire au site).
  const apiKeyModule = container.resolve(Modules.API_KEY)
  let key = (await apiKeyModule.listApiKeys({ type: "publishable", title: "Storefront" }))[0]
  if (!key) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
    })
    key = result[0]
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: key.id, add: [salesChannelId] },
    })
  }

  // Les réglages de commande restent idempotents même si le catalogue existe déjà.
  if (hasCatalog) {
    const existingCatalog = await catalogService.listCatalogProducts({}, { take: 1000 })
    let refreshed = 0
    for (const product of existingCatalog) {
      if (product.description !== "Fictional demo product for the prototype. No real brand, specification or review.") continue
      const department = DEPARTMENTS.find((candidate) => candidate.handle === product.category_handle)
      if (!department) continue
      const type = department.types.find((candidate) => product.title.includes(candidate)) ?? department.types[0]
      const color = String(product.attributes?.color ?? "Slate")
      await catalogService.updateCatalogProducts({
        id: product.id,
        description: demoDescription(department.handle, type, color, String(product.brand ?? ""), String(product.attributes?.model ?? "")),
        attributes: { ...(product.attributes ?? {}), demo_listing: true },
      })
      refreshed += 1
    }
    logger.info(`Réglages de boutique à jour; ${refreshed} anciennes fiches génériques de démonstration actualisées.`)
    return
  }

  // ---------- Rayons ----------
  logger.info(`Rayons : ${DEPARTMENTS.length}…`)
  const categoryModule = container.resolve(Modules.PRODUCT)
  const existingCats = await categoryModule.listProductCategories({}, { select: ["id", "handle"] })
  const have = new Set(existingCats.map((c: any) => c.handle))
  const toCreate = DEPARTMENTS.filter((d) => !have.has(d.handle))
  if (toCreate.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: toCreate.map((d) => ({ name: d.name, handle: d.handle, is_active: true })),
      },
    })
  }

  // ---------- Vendeurs fictifs de démonstration ----------
  logger.info(`Vendeurs : ${VENDORS.length}…`)
  const vendors: { id: string; name: string; locationId: string }[] = []
  for (const v of VENDORS) {
    const created = await marketplace.createVendors({
      name: v.name, handle: v.handle, status: "pending",
      delivery_days_min: v.deliveryMin, delivery_days_max: v.deliveryMax, return_window_days: v.returnDays,
    })
    await setVendorStatusWorkflow(container).run({ input: { vendor_id: created.id, status: "active" } })
    const {
      data: [withLoc],
    } = await query.graph({ entity: "vendor", fields: ["id", "stock_location.id"], filters: { id: created.id } })
    vendors.push({ id: created.id, name: v.name, locationId: withLoc.stock_location.id })
  }

  // ---------- Catalogue : fiches + offres ----------
  const random = rng(20261012)
  const pick = <T,>(arr: T[]) => arr[Math.floor(random() * arr.length)]
  let catalogCount = 0
  let offerCount = 0

  for (const dept of DEPARTMENTS) {
    logger.info(`Catalogue : ${dept.name} (${perCategory} fiches)…`)
    const rows: { catalog: any; offers: { vendorIdx: number; price: number; stock: number; condition: string }[] }[] = []

    for (let i = 0; i < perCategory; i++) {
      const type = dept.types[i % dept.types.length]
      const brand = BRANDS[Math.floor(random() * BRANDS.length)]
      const code = `${String.fromCharCode(65 + Math.floor(random() * 26))}${100 + Math.floor(random() * 900)}`
      const title = `${brand} ${type} ${code}`
      const color = pick(COLORS)
      const imageKey = `${dept.handle}-${i + 1}`
      const handle = `${dept.handle}-${i + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
      const base = dept.priceMin + random() * (dept.priceMax - dept.priceMin)
      const offerTotal = 1 + Math.floor(random() * 4) // 1 à 4 offres
      const chosen = new Set<number>()
      while (chosen.size < Math.min(offerTotal, vendors.length)) chosen.add(Math.floor(random() * vendors.length))

      const catalog = await catalogService.createCatalogProducts({
        handle, title, brand, category_handle: dept.handle,
        description: demoDescription(dept.handle, type, color, brand, code),
        attributes: { color, model: code, image_key: imageKey, demo_listing: true },
      })
      rows.push({
        catalog,
        offers: [...chosen].map((vendorIdx) => ({
          vendorIdx,
          price: Math.round(base * (0.9 + random() * 0.3) * 100) / 100,
          stock: 3 + Math.floor(random() * 58),
          condition: dept.handle === "electronics" && random() < 0.25 ? "renewed" : "new",
        })),
      })
    }

    // Création des produits vendeur par lots.
    const flat = rows.flatMap((r) => r.offers.map((o) => ({ ...o, catalog: r.catalog })))
    for (let start = 0; start < flat.length; start += 40) {
      const batch = flat.slice(start, start + 40)
      const { result: created } = await createProductsWorkflow(container).run({
        input: {
          products: batch.map((o) => ({
            title: o.catalog.title,
            handle: `${o.catalog.handle}-${vendors[o.vendorIdx].id.slice(-6).toLowerCase()}`,
            status: "published" as const,
            shipping_profile_id: profile.id,
            sales_channels: [{ id: salesChannelId! }],
            options: [{ title: "Default", values: ["Default"] }],
            metadata: { condition: o.condition, catalog_handle: o.catalog.handle },
            variants: [
              {
                title: "Default",
                options: { Default: "Default" },
                manage_inventory: true,
                prices: [{ amount: o.price, currency_code: "cad" }],
              },
            ],
          })),
        },
      })

      const links: any[] = []
      created.forEach((p: any, idx: number) => {
        links.push({
          [MARKETPLACE_MODULE]: { vendor_id: vendors[batch[idx].vendorIdx].id },
          [Modules.PRODUCT]: { product_id: p.id },
        })
        links.push({
          [CATALOG_MODULE]: { catalog_product_id: batch[idx].catalog.id },
          [Modules.PRODUCT]: { product_id: p.id },
        })
      })
      await link.create(links)

      const variantIds = created.map((p: any) => p.variants[0].id)
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory_item_id"],
        filters: { id: variantIds },
      })
      const itemByVariant = new Map<string, string>(
        variants.map((v: any) => [v.id, v.inventory_items[0].inventory_item_id])
      )
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: created.map((p: any, idx: number) => ({
            inventory_item_id: itemByVariant.get(p.variants[0].id)!,
            location_id: vendors[batch[idx].vendorIdx].locationId,
            stocked_quantity: batch[idx].stock,
          })),
        },
      })
      offerCount += batch.length
    }
    catalogCount += rows.length
  }

  logger.info(`Terminé : ${catalogCount} fiches catalogue, ${offerCount} offres, ${vendors.length} vendeurs fictifs.`)
  logger.info("----------------------------------------------------------------")
  logger.info(`Clé publique à mettre dans le site (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) :`)
  logger.info(String((key as any).token))
  logger.info("----------------------------------------------------------------")
}

function demoDescription(category: string, type: string, color: string, brand: string, model: string) {
  const details: Record<string, string> = {
    electronics: "Cushioned contact points, onboard controls and a foldable profile make it easy to store between uses.",
    computers: "A clean desk companion with a cable-friendly layout, compact footprint and a sturdy everyday finish.",
    "home-kitchen": "A practical kitchen essential with an easy-clean finish, balanced handling and a cupboard-friendly profile.",
    fashion: "An everyday staple made with reinforced seams, adjustable fittings and a roomy main compartment.",
    books: "A comfortable-format edition with a matte cover and a clear page layout, suited to a desk or bedside shelf.",
    "toys-games": "A reusable set for shared play, with components packed together for tidy storage between sessions.",
    "sports-outdoors": "Made for active routines with a grippy surface, a packable shape and a carry-friendly design.",
    "beauty-personal-care": "A compact personal-care essential with a practical closure and a convenient shape for daily storage.",
    "health-household": "A household-use design with straightforward controls and removable parts for routine cleaning. No medical claims are made.",
    grocery: "A pantry-friendly format designed for simple storage and everyday use. Ingredients and package details are illustrative in this prototype.",
    "pet-supplies": "An everyday pet accessory with a simple, easy-to-clean form and a practical size for home use.",
    automotive: "A compact car accessory designed to keep common travel essentials organized within easy reach.",
    "tools-home-improvement": "A practical workshop essential with a comfortable grip and a compact form for a home tool kit.",
    "office-products": "A desk essential designed to keep daily work organized, with a compact footprint and an easy-care finish.",
    "garden-outdoor": "A useful addition to a home garden with a straightforward form suited to patios, balconies or garden beds.",
    baby: "A nursery and family-care accessory with a soft-touch finish and a practical design for everyday routines.",
    "arts-crafts": "A creative-work essential designed for home projects, with supplies that store neatly between sessions.",
    "musical-instruments": "An approachable music-making essential with a comfortable grip and a compact profile for practice at home.",
    "video-games": "A gaming accessory with an easy-to-store shape, designed for casual play and a tidy entertainment setup.",
    "movies-hobbies": "A hobby essential designed for hands-on projects, with a compact form that stores neatly between uses.",
  }
  return `${brand} ${type}, model ${model}, in ${color.toLowerCase()}. ${details[category] ?? "A practical everyday item with a compact, easy-to-store design."} The brand, model, specifications, price and stock are fictional prototype details; the photograph illustrates this product type.`
}
