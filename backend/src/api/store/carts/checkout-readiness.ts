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

export function isStripeProductionConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.STRIPE_API_KEY?.startsWith("sk_live_") &&
    env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")
  )
}

export function isShipStationProductionConfigured(
  env: NodeJS.ProcessEnv = process.env,
  input: {
    providerId?: string | null
    storeShippingOptions: Array<{ provider_id: string; price_type: string }>
  }
): boolean {
  return Boolean(
    env.SHIPSTATION_API_KEY?.trim() &&
    input.providerId?.toLowerCase().includes("shipstation") &&
    input.storeShippingOptions.length > 0 &&
    input.storeShippingOptions.every((option) =>
      option.provider_id === input.providerId && option.price_type === "calculated"
    )
  )
}

export async function isStoreShippingReady(
  fulfillmentModule: {
    listFulfillmentProviders: () => Promise<Array<{ id: string }>>
    listShippingOptions: (filters?: Record<string, unknown>) => Promise<Array<{
      provider_id: string
      price_type: string
      rules?: Array<{ attribute: string; value: { value: string | string[] } | null }>
    }>>
  },
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const [providers, options] = await Promise.all([
    fulfillmentModule.listFulfillmentProviders(),
    fulfillmentModule.listShippingOptions({}),
  ])
  const provider = providers.find((item) => item.id.toLowerCase().includes("shipstation"))
  const storeShippingOptions = options
    .filter((option) => option.rules?.some((rule) =>
      rule.attribute === "enabled_in_store" &&
      (rule.value?.value === "true" || (Array.isArray(rule.value?.value) && rule.value.value.includes("true")))
    ))
  return isShipStationProductionConfigured(env, {
    providerId: provider?.id,
    storeShippingOptions,
  })
}

export function isProductionCheckoutReady(input: {
  paymentProviderId?: string | null
  taxProviderId?: string | null
  stripeConfigured: boolean
  sendgridConfigured: boolean
  avalaraProductionConfigured: boolean
  taxCatalogVerified: boolean
  shippingConfigured: boolean
}): boolean {
  return Boolean(
    input.paymentProviderId === "pp_stripe_stripe" && input.stripeConfigured &&
    input.taxProviderId === "tp_avalara" && input.avalaraProductionConfigured &&
    input.taxCatalogVerified && input.sendgridConfigured && input.shippingConfigured
  )
}
