import { model } from "@medusajs/framework/utils"

// Demande de retour associée à une ligne de commande vendeur.
const ReturnRequest = model.define("return_request", {
  id: model.id().primaryKey(),
  parent_order_id: model.text().index(),
  vendor_order_id: model.text().index(),
  vendor_id: model.text().index(),
  order_item_id: model.text().index(),
  customer_id: model.text().nullable(),
  quantity: model.number(),
  reason: model.enum(["damaged", "wrong_item", "not_as_described", "no_longer_needed"]),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  decision_note: model.text().nullable(),
  decided_by: model.text().nullable(),
})

export default ReturnRequest
