import { Modules } from "@medusajs/framework/utils"
import { createTaxRegionsWorkflow } from "@medusajs/medusa/core-flows"

// Taux généraux combinés pour des biens taxables courants, au 12 novembre 2026.
// Ce barème de démonstration ne couvre ni exemptions, ni classifications, ni obligations
// d'inscription et ne doit pas remplacer un fournisseur fiscal en production.
export const CANADIAN_DEMO_TAX_RATES: Record<string, { name: string; rate: number }> = {
  ab: { name: "Alberta illustrative GST", rate: 5 },
  bc: { name: "British Columbia illustrative GST and PST", rate: 12 },
  mb: { name: "Manitoba illustrative GST and RST", rate: 12 },
  nb: { name: "New Brunswick illustrative HST", rate: 15 },
  nl: { name: "Newfoundland and Labrador illustrative HST", rate: 15 },
  ns: { name: "Nova Scotia illustrative HST", rate: 14 },
  nt: { name: "Northwest Territories illustrative GST", rate: 5 },
  nu: { name: "Nunavut illustrative GST", rate: 5 },
  on: { name: "Ontario illustrative HST", rate: 13 },
  pe: { name: "Prince Edward Island illustrative HST", rate: 15 },
  qc: { name: "Quebec illustrative GST and QST", rate: 14.975 },
  sk: { name: "Saskatchewan illustrative GST and PST", rate: 11 },
  yt: { name: "Yukon illustrative GST", rate: 5 },
}

export async function configureCanadianDemoTaxes(container: any) {
  const tax = container.resolve(Modules.TAX)
  const canadianRegions = await tax.listTaxRegions({ country_code: "ca" })
  let countryRegion = canadianRegions.find((region: any) => !region.province_code)

  if (!countryRegion) {
    const { result } = await createTaxRegionsWorkflow(container).run({
      input: [{
        country_code: "ca",
        provider_id: "tp_system",
        default_tax_rate: {
          name: "Canada illustrative GST (5%)",
          code: "ca-demo-gst-5",
          rate: 5,
        },
      }],
    })
    countryRegion = result[0]
  }

  const countryRates = await tax.listTaxRates({ tax_region_id: countryRegion.id })
  const countryDefault = countryRates.find((rate: any) => rate.is_default)
  if (countryDefault && countryDefault.rate !== 5) {
    await tax.updateTaxRates(countryDefault.id, { name: "Canada illustrative GST (5%)", code: "ca-demo-gst-5", rate: 5 })
  } else if (!countryDefault) {
    await tax.createTaxRates({
      tax_region_id: countryRegion.id,
      name: "Canada illustrative GST (5%)",
      code: "ca-demo-gst-5",
      rate: 5,
      is_default: true,
    })
  }

  for (const [provinceCode, taxInfo] of Object.entries(CANADIAN_DEMO_TAX_RATES)) {
    let province = canadianRegions.find((region: any) => region.province_code === provinceCode)
    if (!province) {
      const { result } = await createTaxRegionsWorkflow(container).run({
        input: [{
          country_code: "ca",
          province_code: provinceCode,
          parent_id: countryRegion.id,
          default_tax_rate: {
            name: `${taxInfo.name} (${taxInfo.rate}%)`,
            code: `ca-demo-${provinceCode}-${String(taxInfo.rate).replace(".", "-")}`,
            rate: taxInfo.rate,
          },
        }],
      })
      province = result[0]
    }

    const rates = await tax.listTaxRates({ tax_region_id: province.id })
    const defaultRate = rates.find((rate: any) => rate.is_default)
    const name = `${taxInfo.name} (${taxInfo.rate}%)`
    const code = `ca-demo-${provinceCode}-${String(taxInfo.rate).replace(".", "-")}`
    if (defaultRate && defaultRate.rate !== taxInfo.rate) {
      await tax.updateTaxRates(defaultRate.id, { name, code, rate: taxInfo.rate })
    } else if (!defaultRate) {
      await tax.createTaxRates({ tax_region_id: province.id, name, code, rate: taxInfo.rate, is_default: true })
    }
  }
}
