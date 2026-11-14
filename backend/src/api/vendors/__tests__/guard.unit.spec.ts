import { isPendingShippingOriginUpdate } from "../guard"

describe("droits de correction de l'origine d'expédition d'une candidature", () => {
  it("autorise la mise à jour PATCH de la route vendeur même avec préfixe ou slash final", () => {
    expect(isPendingShippingOriginUpdate("PATCH", "/vendors/shipping-origin")).toBe(true)
    expect(isPendingShippingOriginUpdate("PATCH", "/store/vendors/shipping-origin/")).toBe(true)
  })

  it("n'étend pas ce droit de candidature aux autres méthodes ou routes", () => {
    expect(isPendingShippingOriginUpdate("GET", "/vendors/shipping-origin")).toBe(false)
    expect(isPendingShippingOriginUpdate("PATCH", "/vendors/products")).toBe(false)
  })
})
