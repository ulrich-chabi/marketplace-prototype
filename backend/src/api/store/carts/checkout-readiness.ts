export function isProductionCheckoutReady(input: {
  paymentProviderId?: string | null
  taxProviderId?: string | null
  sendgridConfigured: boolean
}): boolean {
  return Boolean(
    input.paymentProviderId && input.paymentProviderId !== "pp_system_default" &&
    input.taxProviderId && input.taxProviderId !== "tp_system" &&
    input.sendgridConfigured
  )
}
