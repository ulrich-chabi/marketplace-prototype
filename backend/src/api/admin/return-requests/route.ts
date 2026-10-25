import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import MarketplaceModuleService from "../../../modules/marketplace/service"

// File de demandes de retour, réservée à la plateforme.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const service: MarketplaceModuleService = req.scope.resolve(MARKETPLACE_MODULE)
  const q = req.query as Record<string, string | undefined>
  const limit = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), 200)
  const offset = Math.max(Number(q.offset ?? 0) || 0, 0)
  const [requests, count] = await service.listAndCountReturnRequests(
    q.status ? { status: q.status as "pending" | "approved" | "rejected" } : {},
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  )
  res.json({ return_requests: requests, count, limit, offset })
}
