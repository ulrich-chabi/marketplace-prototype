export function isAvalaraProductionConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const accountId = Number(env.AVALARA_ACCOUNT_ID)
  const companyId = Number(env.AVALARA_COMPANY_ID)
  return Boolean(
    Number.isSafeInteger(accountId) && accountId > 0 &&
    Number.isSafeInteger(companyId) && companyId > 0 &&
    env.AVALARA_LICENSE_KEY?.trim() && env.AVALARA_COMPANY_CODE?.trim() &&
    env.AVALARA_ENVIRONMENT === "production" && env.AVALARA_SHIPPING_TAX_CODE?.trim()
  )
}

export function isProductionCheckoutReady(input: {
  paymentProviderId?: string | null
  taxProviderId?: string | null
  stripeConfigured: boolean
  sendgridConfigured: boolean
  avalaraProductionConfigured: boolean
  taxCatalogVerified: boolean
}): boolean {
  return Boolean(
    input.paymentProviderId === "pp_stripe_stripe" && input.stripeConfigured &&
    input.taxProviderId === "tp_avalara" && input.avalaraProductionConfigured &&
    input.taxCatalogVerified && input.sendgridConfigured
  )
}
