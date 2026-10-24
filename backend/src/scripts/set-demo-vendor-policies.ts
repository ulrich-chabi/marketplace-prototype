import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MARKETPLACE_MODULE } from "../modules/marketplace"
import { VENDORS } from "./seed-data"

// Renseigne les délais de livraison et durées de retour FICTIFS des vendeurs de
// démonstration déjà présents en base (à lancer une fois après la mise à jour) :
//   npx medusa exec ./src/scripts/set-demo-vendor-policies.ts
export default async function setDemoVendorPolicies({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: any = container.resolve(MARKETPLACE_MODULE)
  let updated = 0
  for (const v of VENDORS) {
    const [vendor] = await service.listVendors({ handle: v.handle })
    if (!vendor) continue
    await service.updateVendors({
      id: vendor.id,
      delivery_days_min: v.deliveryMin,
      delivery_days_max: v.deliveryMax,
      return_window_days: v.returnDays,
    })
    updated += 1
  }
  logger.info(`Politiques fictives mises à jour pour ${updated} vendeur(s).`)
}
