export function isProductionCheckoutReady(input: {
  paymentProviderId?: string | null
  taxProviderId?: string | null
  stripeConfigured: boolean
  sendgridConfigured: boolean
}): boolean {
  return Boolean(
    input.paymentProviderId === "pp_stripe_stripe" && input.stripeConfigured &&
    input.taxProviderId && input.taxProviderId !== "tp_system" &&
    input.sendgridConfigured
  )
}
