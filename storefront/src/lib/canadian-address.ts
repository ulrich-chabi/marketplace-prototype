const CANADIAN_PROVINCES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"])
const CANADIAN_POSTAL_CODE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/

export function normalizeCanadianPostalCode(value: string) {
  const compact = value.trim().toUpperCase().replace(/[ -]/g, "")
  if (!CANADIAN_POSTAL_CODE.test(compact)) return null
  return `${compact.slice(0, 3)} ${compact.slice(3)}`
}

export function isCanadianProvince(value: string) {
  return CANADIAN_PROVINCES.has(value.trim().toUpperCase())
}
