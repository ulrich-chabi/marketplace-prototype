import { model } from "@medusajs/framework/utils"
import VendorAdmin from "./vendor-admin"

export const VENDOR_STATUSES = ["pending", "active", "suspended"] as const
export type VendorStatus = (typeof VENDOR_STATUSES)[number]

const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  logo: model.text().nullable(),
  // Politique du vendeur affichée sur les offres (valeurs FICTIVES dans ce prototype).
  delivery_days_min: model.number().nullable(),
  delivery_days_max: model.number().nullable(),
  return_window_days: model.number().nullable(),
  // Adresse privée du vendeur, utilisée pour les services d'expédition.
  shipping_origin_address_1: model.text().nullable(),
  shipping_origin_city: model.text().nullable(),
  shipping_origin_province: model.text().nullable(),
  shipping_origin_postal_code: model.text().nullable(),
  shipping_origin_phone: model.text().nullable(),
  // pending → active ⇄ suspended. Seule la plateforme change le statut.
  status: model.enum([...VENDOR_STATUSES]).default("pending"),
  admins: model.hasMany(() => VendorAdmin, { mappedBy: "vendor" }),
})

export default Vendor
