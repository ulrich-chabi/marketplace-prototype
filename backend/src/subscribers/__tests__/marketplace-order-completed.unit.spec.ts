import { hasStripePayment } from "../marketplace-order-completed"

describe("éligibilité de l'email de commande", () => {
  it("refuse les commandes démo", () => {
    expect(hasStripePayment({ payment_collections: [{ payment_sessions: [{ provider_id: "pp_system_default" }] }] })).toBe(false)
  })

  it("accepte une commande avec une session Stripe", () => {
    expect(hasStripePayment({ payment_collections: [{ payment_sessions: [{ provider_id: "pp_stripe_stripe" }] }] })).toBe(true)
  })
})
