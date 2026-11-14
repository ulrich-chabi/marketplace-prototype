import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import orderCompletedHandler, { hasStripePayment } from "../marketplace-order-completed"

describe("éligibilité de l'email de commande", () => {
  it("refuse les commandes démo", () => {
    expect(hasStripePayment({ payment_collections: [{ payment_sessions: [{ provider_id: "pp_system_default" }] }] })).toBe(false)
  })

  it("accepte une commande avec une session Stripe", () => {
    expect(hasStripePayment({ payment_collections: [{ payment_sessions: [{ provider_id: "pp_stripe_stripe" }] }] })).toBe(true)
  })

  it("n'envoie rien si SendGrid n'est pas configuré", async () => {
    const original = {
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.SENDGRID_FROM,
      template: process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID,
      url: process.env.STOREFRONT_PUBLIC_URL,
    }
    delete process.env.SENDGRID_API_KEY
    delete process.env.SENDGRID_FROM
    delete process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID
    delete process.env.STOREFRONT_PUBLIC_URL
    const resolve = jest.fn()

    try {
      await orderCompletedHandler({ event: { data: { id: "order_demo" } }, container: { resolve } } as any)
      expect(resolve).not.toHaveBeenCalled()
    } finally {
      if (original.apiKey === undefined) delete process.env.SENDGRID_API_KEY
      else process.env.SENDGRID_API_KEY = original.apiKey
      if (original.from === undefined) delete process.env.SENDGRID_FROM
      else process.env.SENDGRID_FROM = original.from
      if (original.template === undefined) delete process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID
      else process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID = original.template
      if (original.url === undefined) delete process.env.STOREFRONT_PUBLIC_URL
      else process.env.STOREFRONT_PUBLIC_URL = original.url
    }
  })

  it("envoie les seuls champs prévus pour une commande Stripe, sans code privé de suivi", async () => {
    const keys = {
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.SENDGRID_FROM,
      template: process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID,
      url: process.env.STOREFRONT_PUBLIC_URL,
    }
    process.env.SENDGRID_API_KEY = "test-key"
    process.env.SENDGRID_FROM = "orders@example.test"
    process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID = "d-template"
    process.env.STOREFRONT_PUBLIC_URL = "https://shop.example.test/"
    const order = {
      id: "order_demo",
      display_id: 27,
      email: "buyer@example.test",
      currency_code: "cad",
      total: 1234,
      created_at: "2026-11-01T12:00:00.000Z",
      payment_collections: [{ payment_sessions: [{ provider_id: "pp_stripe_stripe" }] }],
      metadata: { guest_tracking_code_hash: "private-hash" },
    }
    const createNotifications = jest.fn().mockResolvedValue({})
    const query = { graph: jest.fn().mockResolvedValue({ data: [order] }) }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) return query
        if (key === Modules.NOTIFICATION) return { createNotifications }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    try {
      await orderCompletedHandler({ event: { data: { id: order.id } }, container } as any)
      expect(query.graph).toHaveBeenCalledWith(expect.objectContaining({
        fields: expect.not.arrayContaining(["metadata", "tracking_code", "access_code"]),
      }))
      expect(createNotifications).toHaveBeenCalledWith({
        to: order.email,
        channel: "email",
        template: "d-template",
        data: {
          order_number: 27,
          total: "$12.34",
          currency: "CAD",
          order_date: new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(new Date(order.created_at)),
          store_name: "Marketplace Canada",
          storefront_url: "https://shop.example.test",
        },
      })
      const payload = createNotifications.mock.calls[0][0]
      expect(JSON.stringify(payload)).not.toContain("tracking")
      expect(JSON.stringify(payload)).not.toContain("private-hash")
    } finally {
      if (keys.apiKey === undefined) delete process.env.SENDGRID_API_KEY
      else process.env.SENDGRID_API_KEY = keys.apiKey
      if (keys.from === undefined) delete process.env.SENDGRID_FROM
      else process.env.SENDGRID_FROM = keys.from
      if (keys.template === undefined) delete process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID
      else process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID = keys.template
      if (keys.url === undefined) delete process.env.STOREFRONT_PUBLIC_URL
      else process.env.STOREFRONT_PUBLIC_URL = keys.url
    }
  })
})
