import { CANADIAN_DEMO_TAX_RATES } from "../canadian-demo-tax"

describe("taux fiscaux généraux de démonstration du Canada", () => {
  it("couvre exactement les 10 provinces et 3 territoires", () => {
    expect(Object.keys(CANADIAN_DEMO_TAX_RATES).sort()).toEqual([
      "ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yt",
    ])
  })

  it("utilise les taux généraux publiés en Ontario, au Québec et en Nouvelle-Écosse", () => {
    expect(CANADIAN_DEMO_TAX_RATES.on.rate).toBe(13)
    expect(CANADIAN_DEMO_TAX_RATES.qc.rate).toBe(14.975)
    expect(CANADIAN_DEMO_TAX_RATES.ns.rate).toBe(14)
  })
})
