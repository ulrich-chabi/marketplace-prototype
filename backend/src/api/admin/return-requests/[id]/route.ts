import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { recordAudit } from "../../../../modules/security/audit"
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace"
import MarketplaceModuleService from "../../../../modules/marketplace/service"

export const PostReturnDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decision_note: z.enum(["request_approved", "outside_return_policy", "insufficient_information"]).optional(),
}).strict()

export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof PostReturnDecisionSchema>>,
  res: MedusaResponse
) => {
  const service: MarketplaceModuleService = req.scope.resolve(MARKETPLACE_MODULE)
  const { status, decision_note } = req.validatedBody
  const existing = await service.retrieveReturnRequest(req.params.id).catch(() => null)
  if (!existing || existing.status !== "pending") {
    return res.status(404).json({ message: "Pending return request not found." })
  }
  const updated = await service.updateReturnRequests({
    id: existing.id,
    status,
    decision_note: decision_note || null,
    decided_by: req.auth_context?.actor_id ?? null,
  })
  await recordAudit(req.scope, {
    action: `return_request.${status}`,
    actor_type: req.auth_context?.actor_type,
    actor_id: req.auth_context?.actor_id,
    ip: req.ip ?? null,
    target_type: "return_request",
    target_id: existing.id,
    metadata: { order_id: existing.parent_order_id, decision_note: decision_note ?? null },
  })
  res.json({ return_request: updated })
}
