import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function orderCompletedHandler({ event, container }: SubscriberArgs<{ id: string }>) {
  const template = process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID
  const publicUrl = process.env.STOREFRONT_PUBLIC_URL
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM || !template || !publicUrl) {
    console.info("Order confirmation email skipped: SendGrid is not configured.")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "currency_code", "total", "created_at"],
    filters: { id: event.data.id },
  })
  if (!order?.email) return

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to: order.email,
    channel: "email",
    template,
    data: {
      order_number: order.display_id,
      total: new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: order.currency_code.toUpperCase(),
      }).format(Number(order.total) / 100),
      currency: order.currency_code.toUpperCase(),
      order_date: new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(new Date(order.created_at)),
      store_name: "Marketplace Canada",
      storefront_url: publicUrl.replace(/\/$/, ""),
    },
  })
}

export const config: SubscriberConfig = { event: "marketplace.order.completed" }
