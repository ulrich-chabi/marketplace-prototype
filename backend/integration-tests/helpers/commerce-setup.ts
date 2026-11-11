import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

// Boutique de test : Canada, CAD, livraison forfaitaire, paiement système.
export async function setupCommerce(container: MedusaContainer) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const store = (await container.resolve(Modules.STORE).listStores())[0]

  const { result: channels } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name: "Test Channel" }] },
  })
  const channel = channels[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "cad", is_default: true }],
        default_sales_channel_id: channel.id,
      },
    },
  })

  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Canada",
          currency_code: "cad",
          countries: ["ca"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })
  const { result: taxRegions } = await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "ca", provider_id: "tp_system" }],
  })
  await container.resolve(Modules.TAX).createTaxRates({
    tax_region_id: taxRegions[0].id,
    name: "Demo tax (1%)",
    code: "demo-tax-1-percent",
    rate: 1,
    is_default: true,
  })

  const { result: locations } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        { name: "Canada Warehouse", address: { city: "Toronto", country_code: "CA", address_1: "" } },
      ],
    },
  })
  const location = locations[0]
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: location.id, add: [channel.id] },
  })

  let profile = (await fulfillment.listShippingProfiles({ type: "default" }))[0]
  if (!profile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    profile = result[0]
  }

  const set = await fulfillment.createFulfillmentSets({
    name: "Canada delivery",
    type: "shipping",
    service_zones: [{ name: "Canada", geo_zones: [{ country_code: "ca", type: "country" }] }],
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
  })

  const { result: options } = await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: set.service_zones[0].id,
        shipping_profile_id: profile.id,
        type: { label: "Standard", description: "Test shipping", code: "standard" },
        prices: [{ currency_code: "cad", amount: 5 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  const { result: keys } = await createApiKeysWorkflow(container).run({
    input: { api_keys: [{ title: "Test key", type: "publishable", created_by: "" }] },
  })
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: keys[0].id, add: [channel.id] },
  })

  return {
    regionId: regions[0].id,
    salesChannelId: channel.id,
    locationId: location.id,
    shippingProfileId: profile.id,
    shippingOptionId: options[0].id,
    publishableKey: keys[0].token,
  }
}
