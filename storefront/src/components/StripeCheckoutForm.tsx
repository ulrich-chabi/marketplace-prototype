"use client"

import { useEffect, useState } from "react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { completeStripeOrder } from "@/lib/actions"

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

function PaymentForm() {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function completePayment() {
    setBusy(true)
    await completeStripeOrder()
  }

  useEffect(() => {
    const returnedSecret = new URLSearchParams(window.location.search).get("payment_intent_client_secret")
    if (!returnedSecret || !stripe) return
    stripe.retrievePaymentIntent(returnedSecret).then(({ paymentIntent, error: retrieveError }) => {
      if (retrieveError) setError(retrieveError.message ?? "Payment could not be verified.")
      else if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") void completePayment()
      else setError("Payment was not completed. Please review your payment details and try again.")
    })
  }, [stripe])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements || busy) return
    setBusy(true)
    setError("")
    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? "Check your payment details.")
      setBusy(false)
      return
    }
    const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout?payment=ready` },
      redirect: "if_required",
    })
    if (paymentError) {
      const intent = paymentError.payment_intent
      if (intent?.status === "succeeded" || intent?.status === "requires_capture") return completePayment()
      setError(paymentError.message ?? "Payment could not be completed.")
      setBusy(false)
      return
    }
    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") return completePayment()
    setError("The payment provider has not confirmed this payment yet.")
    setBusy(false)
  }

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-sand bg-white p-5">
    <h2 className="text-xl font-semibold">Secure payment</h2>
    <PaymentElement options={{ layout: "accordion" }} />
    {error && <p role="alert" className="rounded-xl border border-terracotta p-3 text-sm">{error}</p>}
    <button type="submit" disabled={!stripe || !elements || busy} className="min-h-11 rounded-xl bg-terracotta px-5 text-white disabled:opacity-60">
      {busy ? "Processing payment…" : "Pay securely"}
    </button>
  </form>
}

export default function StripeCheckoutForm({ clientSecret }: { clientSecret: string }) {
  if (!stripePromise) return <p role="alert">Stripe checkout is not configured.</p>
  return <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}><PaymentForm /></Elements>
}
