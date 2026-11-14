import { CanadianShippingOriginSchema, shippingOriginToStockLocationAddress } from "../shipping-origin-schema"

describe("origine d'expédition canadienne", () => {
  const base = {
    address_1: "100 Fictional Maple Street",
    city: "Toronto",
    province: "ON",
    postal_code: "m5v0a1",
    phone: "416-555-0101",
  }

  it("normalise le code postal et construit une adresse de stock canadienne", () => {
    const origin = CanadianShippingOriginSchema.parse(base)
    expect(origin.postal_code).toBe("M5V 0A1")
    expect(shippingOriginToStockLocationAddress(origin)).toMatchObject({
      country_code: "ca",
      province: "ca-on",
      city: "Toronto",
    })
  })

  it("refuse les numéros non canadiens et les codes postaux invalides", () => {
    expect(CanadianShippingOriginSchema.safeParse({ ...base, phone: "+44 20 7946 0958" }).success).toBe(false)
    expect(CanadianShippingOriginSchema.safeParse({ ...base, postal_code: "12345" }).success).toBe(false)
  })
})
