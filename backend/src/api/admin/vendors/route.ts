import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: vendors } = await query.graph({
    entity: "vendor",
    fields: ["id", "name", "handle", "status", "created_at", "return_window_days", "delivery_days_min", "delivery_days_max"],
  })
  res.json({ vendors })
}
