import { isAvalaraProductionConfigured, isProductionCheckoutReady, isShipStationProductionConfigured, isStoreShippingReady } from "../checkout-readiness"

describe("préparation du checkout de production", () => {
  const realProviders = {
    paymentProviderId: "pp_stripe_stripe",
    taxProviderId: "tp_avalara",
    stripeConfigured: true,
    sendgridConfigured: true,
    avalaraProductionConfigured: true,
    taxCatalogVerified: true,
    shippingConfigured: true,
  }

  it("n'accepte que des identifiants Avalara de production complets et un code livraison", () => {
    const env = {
      AVALARA_ACCOUNT_ID: "123",
      AVALARA_LICENSE_KEY: "secret",
      AVALARA_COMPANY_ID: "456",
      AVALARA_COMPANY_CODE: "CANADA",
      AVALARA_ENVIRONMENT: "production",
      AVALARA_SHIPPING_TAX_CODE: "verified-code",
    }
    expect(isAvalaraProductionConfigured(env)).toBe(true)
    expect(isAvalaraProductionConfigured({ ...env, AVALARA_ENVIRONMENT: "sandbox" })).toBe(false)
    expect(isAvalaraProductionConfigured({ ...env, AVALARA_ACCOUNT_ID: "0" })).toBe(false)
    expect(isAvalaraProductionConfigured({ ...env, AVALARA_SHIPPING_TAX_CODE: "" })).toBe(false)
  })

  it("refuse les fournisseurs de démonstration", () => {
    expect(isProductionCheckoutReady({ ...realProviders, paymentProviderId: "pp_system_default" })).toBe(false)
    expect(isProductionCheckoutReady({ ...realProviders, paymentProviderId: "pp_fake_provider" })).toBe(false)
    expect(isProductionCheckoutReady({ ...realProviders, taxProviderId: "tp_system" })).toBe(false)
    expect(isProductionCheckoutReady({ ...realProviders, taxProviderId: "tp_other" })).toBe(false)
    expect(isProductionCheckoutReady({ ...realProviders, avalaraProductionConfigured: false })).toBe(false)
    expect(isProductionCheckoutReady({ ...realProviders, taxCatalogVerified: false })).toBe(false)
  })

  it("refuse si les courriels transactionnels ne sont pas configurés", () => {
    expect(isProductionCheckoutReady({ ...realProviders, sendgridConfigured: false })).toBe(false)
  })

  it("refuse si le secret de paiement ou le webhook Stripe manque", () => {
    expect(isProductionCheckoutReady({ ...realProviders, stripeConfigured: false })).toBe(false)
  })

  it("n'accepte que des options de livraison calculées par ShipStation", () => {
    const env = { SHIPSTATION_API_KEY: "test-key" }
    const options = [{ provider_id: "fulfillment_shipstation", price_type: "calculated" }]
    expect(isShipStationProductionConfigured(env, { providerId: "fulfillment_shipstation", storeShippingOptions: options })).toBe(true)
    expect(isShipStationProductionConfigured({}, { providerId: "fulfillment_shipstation", storeShippingOptions: options })).toBe(false)
    expect(isShipStationProductionConfigured(env, { providerId: "manual_manual", storeShippingOptions: options })).toBe(false)
    expect(isShipStationProductionConfigured(env, { providerId: "fulfillment_shipstation", storeShippingOptions: [{ provider_id: "manual_manual", price_type: "flat" }] })).toBe(false)
  })

  it("maintient le checkout production fermé si une étape manque", () => {
    expect(isProductionCheckoutReady({ ...realProviders, shippingConfigured: false })).toBe(false)
  })

  it("n'accepte que les options réellement actives en boutique et calculées par ShipStation", async () => {
    const env = { SHIPSTATION_API_KEY: "test-key" }
    const provider = { id: "fulfillment_shipstation" }
    const option = {
      provider_id: provider.id,
      price_type: "calculated",
      rules: [{ attribute: "enabled_in_store", value: { value: "true" } }],
    }
    const ready = {
      listFulfillmentProviders: async () => [provider],
      listShippingOptions: async () => [option],
    }
    expect(await isStoreShippingReady(ready, env)).toBe(true)
    expect(await isStoreShippingReady({
      ...ready,
      listShippingOptions: async () => [{ ...option, provider_id: "manual_manual", price_type: "flat" }],
    }, env)).toBe(false)
    expect(await isStoreShippingReady({
      ...ready,
      listShippingOptions: async () => [{ ...option, rules: [{ attribute: "enabled_in_store", value: { value: "false" } }] }],
    }, env)).toBe(false)
  })

  it("accepte uniquement les fournisseurs réels et le courriel configuré", () => {
    expect(isProductionCheckoutReady(realProviders)).toBe(true)
  })
})
