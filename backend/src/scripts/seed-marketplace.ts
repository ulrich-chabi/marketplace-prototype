import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
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
import { BRANDS, COLORS, countAvailableDemoProducts, DEPARTMENTS, demoShippingMeasurements, rng, VENDORS } from "./seed-data"
import { configureCanadianDemoTaxes } from "./canadian-demo-tax"
import { shippingOriginToStockLocationAddress } from "../api/vendors/shipping-origin-schema"

// Remplit une boutique canadienne avec des données fictives pour le prototype.
// Ne pas exécuter sur une boutique en production ou contenant des données réelles.
//   npm run seed:demo
// Variable : SEED_PRODUCTS_PER_CATEGORY (12 par défaut, limité aux photos consécutives disponibles).
export default async function seedMarketplace({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const catalogService: any = container.resolve(CATALOG_MODULE)
  const marketplace: any = container.resolve(MARKETPLACE_MODULE)
  const configuredCount = Number(process.env.SEED_PRODUCTS_PER_CATEGORY ?? 20)
  const perCategory = Number.isFinite(configuredCount) ? Math.max(1, Math.min(20, Math.floor(configuredCount))) : 20
  const imageManifestPath = resolve(process.cwd(), "../storefront/src/data/demo-images.json")
  const demoImages = JSON.parse(readFileSync(imageManifestPath, "utf8")) as Record<string, unknown>
  const existingCatalog = await catalogService.listCatalogProducts({}, { take: 1000 })
  const hasCatalog = existingCatalog.length > 0

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
    let refreshed = 0
    for (const product of existingCatalog) {
      if (!product.attributes?.demo_listing) continue
      const department = DEPARTMENTS.find((candidate) => candidate.handle === product.category_handle)
      if (!department) continue
      const imageIndex = Number(String(product.attributes?.image_key ?? "").split("-").at(-1)) - 1
      const type = department.types[imageIndex] ?? department.types.find((candidate) => product.title.includes(candidate)) ?? department.types[0]
      const color = String(product.attributes?.color ?? "Slate")
      await catalogService.updateCatalogProducts({
        id: product.id,
        description: demoDescription(department.handle, type, color, String(product.brand ?? ""), String(product.attributes?.model ?? "")),
        attributes: { ...(product.attributes ?? {}), ...demoProductAttributes(department, type, imageIndex, color), demo_listing: true },
      })
      refreshed += 1
    }
    logger.info(`Réglages de boutique à jour; ${refreshed} fiches de démonstration actualisées.`)
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
    let vendor = (await marketplace.listVendors({ handle: v.handle }, { take: 1 }))[0]
    const shippingOriginFields = {
      shipping_origin_address_1: v.shippingOrigin.address_1,
      shipping_origin_city: v.shippingOrigin.city,
      shipping_origin_province: v.shippingOrigin.province,
      shipping_origin_postal_code: v.shippingOrigin.postal_code,
      shipping_origin_phone: v.shippingOrigin.phone,
    }
    if (!vendor) {
      vendor = await marketplace.createVendors({
        name: v.name, handle: v.handle, status: "pending",
        delivery_days_min: v.deliveryMin, delivery_days_max: v.deliveryMax, return_window_days: v.returnDays,
        ...shippingOriginFields,
      })
    } else {
      vendor = await marketplace.updateVendors({
        id: vendor.id,
        delivery_days_min: v.deliveryMin,
        delivery_days_max: v.deliveryMax,
        return_window_days: v.returnDays,
        ...shippingOriginFields,
      })
    }
    if (vendor.status !== "active") {
      await setVendorStatusWorkflow(container).run({ input: { vendor_id: vendor.id, status: "active" } })
    }
    const {
      data: [withLoc],
    } = await query.graph({ entity: "vendor", fields: ["id", "stock_location.id"], filters: { id: vendor.id } })
    if (!withLoc?.stock_location?.id) throw new Error(`Le vendeur de démonstration ${v.handle} n'a pas d'emplacement de stock.`)
    await container.resolve(Modules.STOCK_LOCATION).updateStockLocations(withLoc.stock_location.id, {
      address: shippingOriginToStockLocationAddress(v.shippingOrigin),
      metadata: { demo_shipping_origin: true },
    })
    vendors.push({ id: vendor.id, name: v.name, locationId: withLoc.stock_location.id })
  }

  // ---------- Catalogue : fiches + offres ----------
  const random = rng(20261012)
  const pick = <T,>(arr: T[]) => arr[Math.floor(random() * arr.length)]
  let catalogCount = 0
  let offerCount = 0
  const existingImageKeys = new Set(
    existingCatalog
      .map((product: any) => product.attributes?.image_key)
      .filter((key: unknown): key is string => typeof key === "string")
  )

  for (const dept of DEPARTMENTS) {
    const productCount = countAvailableDemoProducts(dept, demoImages, perCategory)
    logger.info(`Catalogue : ${dept.name} (${productCount} fiches avec photo dédiée)…`)
    const rows: { catalog: any; offers: { vendorIdx: number; price: number; stock: number; condition: string }[] }[] = []

    for (let i = 0; i < productCount; i++) {
      const imageKey = `${dept.handle}-${i + 1}`
      if (!demoImages[imageKey]) throw new Error(`Photo de démonstration absente : ${imageKey}`)
      if (existingImageKeys.has(imageKey)) continue
      const type = dept.types[i]
      const brand = BRANDS[Math.floor(random() * BRANDS.length)]
      const code = `${String.fromCharCode(65 + Math.floor(random() * 26))}${100 + Math.floor(random() * 900)}`
      const title = `${brand} ${type} ${code}`
      const color = pick(COLORS)
      const handle = `${dept.handle}-${i + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
      const base = dept.priceMin + random() * (dept.priceMax - dept.priceMin)
      const offerTotal = 1 + Math.floor(random() * 4) // 1 à 4 offres
      const chosen = new Set<number>()
      while (chosen.size < Math.min(offerTotal, vendors.length)) chosen.add(Math.floor(random() * vendors.length))

      const catalog = await catalogService.createCatalogProducts({
        handle, title, brand, category_handle: dept.handle,
        description: demoDescription(dept.handle, type, color, brand, code),
        attributes: {
          color,
          model: code,
          image_key: imageKey,
          ...demoProductAttributes(dept, type, i, color),
          demo_listing: true,
        },
      })
      existingImageKeys.add(imageKey)
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
            metadata: { condition: o.condition, catalog_handle: o.catalog.handle, demo_shipping_measurements: true },
            variants: [
              {
                title: "Default",
                options: { Default: "Default" },
                manage_inventory: true,
                ...demoShippingMeasurements(o.catalog.category_handle, Number(o.catalog.attributes?.image_key?.split("-").at(-1)) - 1),
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

  // Complète également les fiches démo déjà présentes, sans toucher aux offres réelles.
  const allCatalog = await catalogService.listCatalogProducts({}, { take: 1000 })
  const catalogByHandle = new Map(allCatalog.map((item: any) => [item.handle, item]))
  const productModule: any = container.resolve(Modules.PRODUCT)
  const inventoryModule: any = container.resolve(Modules.INVENTORY)
  const { data: demoVariants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.id", "product.metadata", "inventory_items.inventory_item_id"],
    pagination: { take: 1000 },
  })
  let measuredVariants = 0
  const markedProducts = new Set<string>()
  for (const variant of demoVariants as any[]) {
    const catalogHandle = variant.product?.metadata?.catalog_handle
    const catalogItem: any = typeof catalogHandle === "string" ? catalogByHandle.get(catalogHandle) : null
    if (!catalogItem?.attributes?.image_key) continue
    const imageIndex = Number(catalogItem.attributes.image_key.split("-").at(-1)) - 1
    const measurements = demoShippingMeasurements(catalogItem.category_handle, imageIndex)
    await productModule.updateProductVariants(variant.id, measurements)
    const inventoryItemId = variant.inventory_items?.find((link: any) => typeof link.inventory_item_id === "string" && link.inventory_item_id)?.inventory_item_id
    if (inventoryItemId) await inventoryModule.updateInventoryItems({ id: inventoryItemId, ...measurements })
    measuredVariants++
    const productId = variant.product?.id
    const metadata = variant.product?.metadata
    if (productId && !markedProducts.has(productId) && metadata?.demo_shipping_measurements !== true) {
      await productModule.updateProducts(productId, {
        metadata: { ...metadata, demo_shipping_measurements: true },
      })
      markedProducts.add(productId)
    }
  }
  logger.info(`Mesures fictives ajoutées aux variantes de démonstration : ${measuredVariants}.`)

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
  const productDetails: Record<string, string> = {
    "E-Reader": "A compact electronic reader with a high-contrast screen, page-turn controls and a slim protective shell.",
    "Fitness Tracker": "A lightweight wrist band with a small activity display, adjustable strap and a clip-in charging cradle.",
    "Docking Station": "A desk dock that props up a compatible tablet and adds a row of wired connection ports.",
    "Graphics Tablet": "A pressure-sensitive drawing surface supplied with a cordless stylus and replacement nibs.",
    Router: "A home network router with multiple wired ports, status lights and removable aerials.",
    "Dish Rack": "A metal counter rack with a separate cutlery cup, plate slots and a fitted drain tray.",
    Toaster: "A two-slot countertop toaster with browning controls, a crumb tray and a cool-touch lever.",
    "Air Fryer": "A countertop convection cooker with a removable basket, front temperature dial and a compact footprint.",
    "Mixing Bowls": "A nested bowl set with graduated capacities, a pour lip on the largest bowl and grippy bases.",
    "Food Scale": "A compact kitchen scale with a flat weighing platform, tare control and a clear digital readout.",
    "Canvas Sneakers": "Low-cut canvas shoes with contrast stitching, a lace-up front and a flexible rubber sole.",
    "Knit Dress": "A rib-knit short-sleeve dress with a fitted waist and geometric contrast panels.",
    "LED Light Bulb": "A compact multi-emitter LED replacement bulb with a clear protective dome and standard screw base.",
    "Game Console": "A vertical home game console with a front-loading disc drive, memory-card slots and wired controller ports.",
    "Dark Chocolate": "Individually wrapped dark chocolate pieces with a firm shell and a soft citrus-style centre; ingredients are illustrative.",
    "Wiper Blades": "A pair of replacement wiper blades with curved rubber edges and adapter clips for common arm fittings.",
    "Emergency Kit": "A compact workplace response kit with a sealed container, clear labels and an illustrated contents card.",
    "Socket Set": "A chrome-finished socket collection with several drive sizes, a ratchet handle and an indexed storage rail.",
    "Utility Knife": "A retractable utility knife with a quick-change blade holder and a textured thumb slider.",
    "Bird Bath": "A shallow garden basin on a low pedestal, designed as a small water feature for outdoor spaces.",
    "Embroidery Hoops": "A set of round wooden hoops with adjustable screw clasps for keeping fabric taut during stitching.",
    "Colored Pencils": "A boxed drawing set with a broad colour range, sharpened cores and a reusable paper tray.",
    "Glue Gun": "A corded craft glue gun with a stand, insulated nozzle guard and a small starter pack of glue sticks.",
    "Origami Paper": "A pack of lightweight square sheets in assorted colours, sized for folding small paper models.",
    "Calligraphy Set": "A writing set arranged in a fitted case with a pen holder, interchangeable nibs and an ink well.",
    Cajon: "A compact box drum with a front striking panel and a rear sound port for seated acoustic playing.",
    "Mouse Pad": "A low-profile desk mat with a smooth tracking surface, stitched edges and a nonslip rubber backing.",
    Webcam: "A compact camera with a clip-on base and adjustable viewing angle for a home desk.",
    "Action Camera": "A pocket-sized camera body with a sealed housing and a quick-release mounting point.",
    "External SSD": "A portable solid-state drive with a protective shell and a short transfer cable.",
    "Laptop Stand": "A folding riser with a vented platform and non-slip contact pads.",
    "Storage Containers": "A stackable set with clear lids and a compact shape for pantry shelves.",
    "Cutting Board": "A reversible food-preparation surface with rounded corners and a juice groove.",
    "Rain Jacket": "A lightweight shell with an adjustable hood, zipped pockets and a packable cut.",
    Backpack: "A day bag with a padded laptop sleeve, water-bottle pocket and reinforced base.",
    "History Atlas": "A large-format reference volume with maps, a place index and a durable lay-flat binding.",
    "Card Game": "A boxed deck with illustrated cards and a quick-start rules sheet for group play.",
    "Sleeping Bag": "A packable sleeping bag with a full-length zip and a drawstring storage sack.",
    "Hair Brush": "A cushioned paddle brush with rounded pins and a comfortable handle.",
    "Pill Organizer": "A weekly organizer with seven removable, clearly marked daily compartments.",
    Thermometer: "A digital household thermometer with a clear readout and a protective storage case.",
    Honey: "A small-batch style pantry jar with a tamper band and a wide-mouth pour opening.",
    "Spice Set": "A matching group of labelled spice jars supplied in a countertop storage rack.",
    "Automatic Feeder": "A programmable feeder with a removable food tray and a simple portion control dial.",
    "Floor Mats": "A four-piece set with raised edges and a textured surface for everyday vehicle use.",
    "Car Vacuum": "A compact 12-volt cleaner with a flexible nozzle and a washable dust cup.",
    "Tool Box": "A portable case with a reinforced handle, removable tray and metal latches.",
    "Laser Level": "A self-levelling line tool with a magnetic base and a compact carry case.",
    "Label Maker": "A handheld label printer with a backlit display and a one-line keyboard.",
    Whiteboard: "A framed dry-erase board with a smooth writing surface and a slim marker ledge.",
    "Compost Bin": "A lidded garden bin with ventilation slots and a hinged access panel.",
    "Bath Tub": "A lightweight infant bath with a contoured base and a smooth, easy-rinse surface.",
    "High Chair": "A compact feeding chair with a fitted tray, raised backrest and stable four-leg frame.",
    "Aquarium Filter": "A compact external aquarium filter with a sealed motor head and visible intake and outlet fittings.",
    "Bird Feeder": "A weather-resistant garden feeder with a covered seed hopper and a wide landing tray.",
    "Craft Scissors": "A lightweight pair with rounded tips, a comfortable grip and stainless blades.",
    "Pottery Tools": "A small shaping set with wooden-handled tools packed in a reusable sleeve.",
    "Guitar Tuner": "A clip-on tuner with a pivoting display and a vibration-sensing clamp.",
    "Music Stand": "A folding stand with an adjustable-height stem and a tilt-adjustable music tray.",
    "Racing Wheel": "A tabletop driving controller with a clamp mount and a textured steering rim.",
    "Capture Card": "A compact video capture board with labelled input ports and a low-profile bracket.",
    "Puzzle Mat": "A roll-up surface with a storage tube to keep an in-progress puzzle together.",
  }
  const productDetail = productDetails[type]
  const detail = productDetail ?? details[category] ?? "A practical everyday item with a compact, easy-to-store design."
  const categoryDetail = productDetail ? "" : ` ${details[category] ?? "Designed for straightforward everyday use."}`
  return `${brand} ${type}, model ${model}, in ${color.toLowerCase()}. ${detail}${categoryDetail} The brand, model, specifications, price and stock are fictional prototype details; the photograph is illustrative.`
}

function demoProductAttributes(department: (typeof DEPARTMENTS)[number], type: string, index: number, color: string) {
  const materials: Record<string, string[]> = {
    electronics: ["ABS polymer and silicone", "Anodized aluminium", "Recycled ABS and nylon"],
    computers: ["Anodized aluminium", "ABS polymer", "Powder-coated steel and silicone"],
    "home-kitchen": ["Food-grade stainless steel", "Borosilicate glass", "Maple wood and silicone"],
    fashion: ["Recycled polyester", "Cotton canvas", "Nylon and polyurethane"],
    books: ["Printed paper with a matte board cover", "Recycled paper and cloth binding", "Paper and laminated board"],
    "toys-games": ["Maple wood and water-based finish", "Molded ABS plastic", "Card stock and fabric"],
    "sports-outdoors": ["Ripstop polyester", "EVA foam and nylon", "Powder-coated aluminium"],
    "beauty-personal-care": ["ABS polymer", "Stainless steel and silicone", "Glass and polypropylene"],
    "health-household": ["Polypropylene", "Stainless steel and ABS", "Recycled polyester"],
    grocery: ["Glass jar with a metal lid", "Recyclable paper pouch", "Food-safe polypropylene container"],
    "pet-supplies": ["Reinforced nylon", "Washable polyester", "Food-safe polypropylene"],
    automotive: ["Molded rubber", "ABS polymer and steel", "Polyester and non-slip backing"],
    "tools-home-improvement": ["Chrome-vanadium steel", "ABS polymer and steel", "Powder-coated aluminium"],
    "office-products": ["Recycled paper and board", "Powder-coated steel", "ABS polymer and silicone"],
    "garden-outdoor": ["Recycled polypropylene", "Galvanized steel", "Powder-coated aluminium"],
    baby: ["BPA-free polypropylene", "Cotton muslin", "Recycled polyester"],
    "arts-crafts": ["Beech wood and stainless steel", "Water-based pigments", "Cotton canvas and paper"],
    "musical-instruments": ["Maple wood and ABS", "Brass and nickel plating", "Powder-coated steel"],
    "video-games": ["ABS polymer and silicone", "Powder-coated steel", "Copper, fiberglass and ABS"],
    "movies-hobbies": ["Acrylic and ABS polymer", "Wood pulp and printed board", "Clear acrylic and aluminium"],
  }
  const packages: Record<string, string[]> = {
    electronics: ["1 main item, charging cable and quick-start card", "1 main item and storage pouch", "1 main item with mounting hardware"],
    computers: ["1 main item, connection cable and setup card", "1 main item with non-slip pads", "1 main item and protective sleeve"],
    "home-kitchen": ["1 kitchen item and care card", "1 coordinated set with storage lids", "1 main item and cleaning brush"],
    fashion: ["1 wearable item in a recyclable sleeve", "1 bag with adjustable straps", "1 item with a small care label"],
    books: ["1 printed volume", "1 illustrated reference book", "1 paperback edition"],
    "toys-games": ["1 play set and illustrated instructions", "1 boxed game with rules card", "1 reusable set with storage pouch"],
    "sports-outdoors": ["1 main item and carry strap", "1 item with a packable storage sack", "1 adjustable item with fitting guide"],
    "beauty-personal-care": ["1 personal-care item and care insert", "1 grooming tool with protective cap", "1 compact set in a storage case"],
    "health-household": ["1 household item and printed instructions", "1 reusable set with storage case", "1 main item with replacement parts"],
    grocery: ["1 sealed demonstration package", "1 pantry jar with tamper band", "1 boxed selection of pantry items"],
    "pet-supplies": ["1 pet accessory and fitting guide", "1 washable item with care instructions", "1 feeding accessory with removable tray"],
    automotive: ["1 vehicle accessory with fitting guide", "1 set with installation hardware", "1 compact item with power cable"],
    "tools-home-improvement": ["1 tool with a fitted storage case", "1 tool set with removable tray", "1 main item and safety instructions"],
    "office-products": ["1 desk item with setup card", "1 stationery set in a reusable case", "1 item with mounting hardware"],
    "garden-outdoor": ["1 garden item with assembly guide", "1 set with reusable storage sleeve", "1 outdoor item and fitting hardware"],
    baby: ["1 nursery item with care instructions", "1 infant-care accessory and storage pouch", "1 item with a washable cover"],
    "arts-crafts": ["1 craft set with illustrated instructions", "1 tool set in a reusable sleeve", "1 creative kit with storage tray"],
    "musical-instruments": ["1 instrument accessory and setup card", "1 adjustable stand with carry sleeve", "1 practice accessory with storage case"],
    "video-games": ["1 gaming accessory with connection cable", "1 controller accessory and setup card", "1 compact device with mounting bracket"],
    "movies-hobbies": ["1 hobby item with setup instructions", "1 display accessory and fitting hardware", "1 reusable project kit with storage pouch"],
  }
  const safeIndex = Number.isInteger(index) && index >= 0 ? index : 0
  const pickAt = (values: string[]) => values[safeIndex % values.length]
  return {
    product_type: type,
    finish: color,
    material: pickAt(materials[department.handle] ?? ["Recycled material"]),
    package_contents: pickAt(packages[department.handle] ?? [`1 ${type} item`]),
  }
}
