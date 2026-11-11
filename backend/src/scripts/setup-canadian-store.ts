import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

// Prépare une boutique canadienne vide. Aucun produit, vendeur, taux de taxe,
// tarif de livraison ou moyen de paiement de démonstration n'est ajouté.
export default async function setupCanadianStore({ container }: ExecArgs) {
  const logger = container.resolve("logger") as { info(message: string): void }
  const storeModule = container.resolve(Modules.STORE)
  const store = (await storeModule.listStores())[0]
  if (!store) throw new Error("La boutique Medusa est introuvable.")

  let salesChannelId = store.default_sales_channel_id as string | null
  if (!salesChannelId) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Canada Storefront" }] },
    })
    salesChannelId = result[0].id
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "cad", is_default: true }],
        default_sales_channel_id: salesChannelId,
      },
    },
  })

  const regionModule = container.resolve(Modules.REGION)
  let region = (await regionModule.listRegions({ currency_code: "cad" })).find(
    (candidate: { countries?: { iso_2?: string }[] }) =>
      candidate.countries?.some((country) => country.iso_2?.toLowerCase() === "ca")
  )
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: { regions: [{ name: "Canada", currency_code: "cad", countries: ["ca"] }] },
    })
    region = result[0]
  }

  const apiKeyModule = container.resolve(Modules.API_KEY)
  let key = (await apiKeyModule.listApiKeys({ type: "publishable", title: "Canada Storefront" }))[0]
  if (!key) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title: "Canada Storefront", type: "publishable", created_by: "" }],
      },
    })
    key = result[0]
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: key.id, add: [salesChannelId] },
    })
  }

  logger.info("Boutique canadienne vide configurée en CAD. Aucun paiement, taxe ou transport simulé n'a été activé.")
  logger.info(`Clé publique à configurer dans storefront/.env.local : ${key.token}`)
}
