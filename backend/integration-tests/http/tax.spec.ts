import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { setupCommerce } from "../helpers/commerce-setup"
import { configureCanadianDemoTaxes } from "../../src/scripts/canadian-demo-tax"

jest.setTimeout(10 * 60 * 1000)

medusaIntegrationTestRunner({
  env: {},
  testSuite: ({ api, getContainer }) => {
    const call = (method: string, url: string, data?: any, headers?: any) =>
      api.request({ method, url, data, headers, validateStatus: () => true })
    let commerce: Awaited<ReturnType<typeof setupCommerce>>
    let storeHeaders: Record<string, string>
    let variantId: string

    async function cartForProvince(province: string) {
      const cartResponse = await call("post", "/store/carts", {
        region_id: commerce.regionId,
        shipping_address: {
          first_name: "Test", last_name: "Buyer", address_1: "1 Test Street",
          city: "Toronto", province, country_code: "ca", postal_code: "M5V 3A8",
        },
      }, storeHeaders)
      expect(cartResponse.status).toBe(200)
      const cartId = cartResponse.data.cart.id
      const added = await call("post", `/store/carts/${cartId}/line-items`, {
        variant_id: variantId, quantity: 1,
      }, storeHeaders)
      expect(added.status).toBe(200)
      return added.data.cart
    }

    beforeAll(async () => {
      const container = getContainer()
      commerce = await setupCommerce(container)
      await configureCanadianDemoTaxes(container)
      storeHeaders = { "x-publishable-api-key": commerce.publishableKey }
      const store = (await container.resolve(Modules.STORE).listStores())[0]
      const { result } = await createProductsWorkflow(container).run({
        input: {
          products: [{
            title: "Tax test item",
            status: "published",
            options: [{ title: "Size", values: ["One"] }],
            variants: [{
              title: "One", options: { Size: "One" }, manage_inventory: false,
              prices: [{ amount: 100, currency_code: "cad" }],
            }],
            sales_channels: [{ id: store.default_sales_channel_id! }],
          }],
        },
      })
      variantId = result[0].variants[0].id
    })

    it("calcule les estimations provinciales du Québec et de l'Ontario", async () => {
      const quebecCart = await cartForProvince("qc")
      const ontarioCart = await cartForProvince("on")
      expect(Number(quebecCart.tax_total)).toBeCloseTo(14.975, 2)
      expect(Number(ontarioCart.tax_total)).toBeCloseTo(13, 2)
    })

    it("configure un taux pour chacune des provinces et territoires du Canada", async () => {
      const regions = await getContainer().resolve(Modules.TAX).listTaxRegions({ country_code: "ca" })
      const provinceCodes = regions.map((region: any) => region.province_code).filter(Boolean).sort()
      expect(provinceCodes).toEqual(["ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yt"])
    })
  },
})
