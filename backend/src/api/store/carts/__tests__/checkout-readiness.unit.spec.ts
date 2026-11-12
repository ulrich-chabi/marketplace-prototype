import { isAvalaraProductionConfigured, isProductionCheckoutReady } from "../checkout-readiness"

describe("préparation du checkout de production", () => {
  const realProviders = {
    paymentProviderId: "pp_stripe_stripe",
    taxProviderId: "tp_avalara",
    stripeConfigured: true,
    sendgridConfigured: true,
    avalaraProductionConfigured: true,
    taxCatalogVerified: true,
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

  it("accepte uniquement les fournisseurs réels et le courriel configuré", () => {
    expect(isProductionCheckoutReady(realProviders)).toBe(true)
  })
})
