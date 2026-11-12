import { isProductionCheckoutReady } from "../checkout-readiness"

describe("préparation du checkout de production", () => {
  const realProviders = { paymentProviderId: "pp_stripe_stripe", taxProviderId: "tp_avalara", stripeConfigured: true, sendgridConfigured: true }

  it("refuse les fournisseurs de démonstration", () => {
    expect(isProductionCheckoutReady({ ...realProviders, paymentProviderId: "pp_system_default" })).toBe(false)
    expect(isProductionCheckoutReady({ ...realProviders, paymentProviderId: "pp_fake_provider" })).toBe(false)
    expect(isProductionCheckoutReady({ ...realProviders, taxProviderId: "tp_system" })).toBe(false)
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
