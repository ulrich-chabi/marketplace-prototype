import { z } from "@medusajs/framework/zod"

export const CANADIAN_PROVINCE_CODES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
] as const

const canadianPostalCode = z.string().trim().transform((value) => value.toUpperCase().replace(/\s+/g, ""))
  .refine((value) => /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(value), {
    message: "Saisissez un code postal canadien valide.",
  })
  .transform((value) => `${value.slice(0, 3)} ${value.slice(3)}`)

export const CanadianShippingOriginSchema = z.object({
  address_1: z.string().trim().min(3).max(150),
  city: z.string().trim().min(2).max(100),
  province: z.enum(CANADIAN_PROVINCE_CODES),
  postal_code: canadianPostalCode,
  phone: z.string().trim().min(7).max(25)
    .refine((value) => {
      const digits = value.replace(/\D/g, "").length
      const nationalDigits = value.replace(/\D/g, "")
      return /^[+\d\s().-]+$/.test(value) &&
        (digits === 10 || (digits === 11 && nationalDigits.startsWith("1")))
    }, { message: "Saisissez un numéro canadien à 10 chiffres, avec +1 facultatif." }),
}).strict()

export type CanadianShippingOrigin = z.infer<typeof CanadianShippingOriginSchema>

export function shippingOriginToVendorFields(origin: CanadianShippingOrigin) {
  return {
    shipping_origin_address_1: origin.address_1,
    shipping_origin_city: origin.city,
    shipping_origin_province: origin.province,
    shipping_origin_postal_code: origin.postal_code,
    shipping_origin_phone: origin.phone,
  }
}

export function shippingOriginToStockLocationAddress(origin: CanadianShippingOrigin) {
  return {
    address_1: origin.address_1,
    city: origin.city,
    province: `ca-${origin.province.toLowerCase()}`,
    postal_code: origin.postal_code,
    phone: origin.phone,
    country_code: "ca",
  }
}
