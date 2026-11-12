// Information for the independent local prototype; this is not a production legal pack.
export const LEGAL_PAGES: Record<string, { title: string; content: string }> = {
  about: { title: "About this concept", content: "An independent multi-vendor marketplace prototype inspired by familiar online shopping patterns. It is not affiliated with Amazon. All brands, sellers, products and order data are fictional." },
  accessibility: { title: "Accessibility", content: "The prototype includes keyboard navigation, a skip link, semantic page landmarks, visible focus styles and reduced-motion support. Automated WCAG checks are included in the browser test suite. No formal conformance certification is claimed." },
  contact: { title: "Contact us", content: "This local prototype has no public customer-support address. During development, contact the project owner through the channel they provided." },
  sell: { title: "Become a seller", content: "Apply to sell or sign in through the seller portal." },
  "seller-sign-in": { title: "Seller sign in", content: "Sign in through the seller portal." },
  advertise: { title: "Advertise your products", content: "Sponsored listings are not included in this prototype. Search results are not paid placements." },
  delivery: { title: "Delivery rates and times", content: "Delivery dates are estimates for the demo. The fictional delivery window is shown on each seller offer. Checkout adds a simulated $5 shipping charge per seller package. No carrier is connected and no shipment is created." },
  payments: { title: "Payment methods", content: "Payments are simulated. The prototype does not charge a card or send payment details to a payment provider." },
  currency: { title: "Currency", content: "Prices and checkout totals are displayed in Canadian dollars (CAD). Demo checkout estimates use general provincial tax rates for ordinary taxable goods. They do not account for product-specific exemptions, seller registrations, every place-of-supply rule or special tax treatment, and are not a tax calculation service or advice. A production marketplace must connect a qualified tax provider and confirm its obligations before accepting orders." },
  returns: { title: "Returns and refunds", content: "This prototype uses fictional return windows shown on each seller offer. A window of 0 days means the offer is not eligible for returns. For an eligible demo order, open Account and submit a request with the private order access code. The platform reviews each request. Approval does not automatically issue a refund; refunds are simulated and handled separately by the platform. No item is shipped to a real carrier." },
  safety: { title: "Product safety notices", content: "The catalog contains fictional demo products and has no real product safety notices. Do not use this prototype to make a real purchasing or safety decision." },
  help: { title: "Help center", content: "Use Account to review orders and request an eligible return. Sellers can review their demo orders in Seller space. Platform operators manage applications, returns and simulated payments in Platform operations." },
  terms: { title: "Terms of use", content: "This site is a local concept prototype for demonstration and development. Listings, sellers, delivery estimates, taxes, orders and payments are fictional or simulated. Do not rely on them for a real purchase or enter sensitive real-world information. A production service would need owner-approved terms before public launch." },
  privacy: { title: "Privacy notice", content: "This local prototype may store account names and email addresses, checkout delivery details, seller applications, orders and security audit events in its PostgreSQL database. Guest order access codes are shown to the customer and only their SHA-256 hashes are stored with orders. Security audit emails and IP addresses are configured for removal after 90 days; failed-login records after 24 hours. Other customer and order data remains in the local database until the project owner removes it. Use fictional data during development. This summary describes the prototype and is not a production privacy notice." },
  "ad-choices": { title: "Your ad choices", content: "This prototype has no advertising, ad personalization or sponsored product placements." },
  "sponsored-results": { title: "How sponsored results work", content: "There are no sponsored results in this prototype. Products are not promoted through paid placement." },
}

export const FOOTER_COLUMNS: { title: string; links: [slug: string, label: string][] }[] = [
  { title: "About", links: [["about", "About this concept"], ["accessibility", "Accessibility"], ["contact", "Contact us"]] },
  { title: "Sell with us", links: [["sell", "Become a seller"], ["seller-sign-in", "Seller sign in"], ["advertise", "Advertise your products"]] },
  { title: "Payments and delivery", links: [["delivery", "Delivery rates and times"], ["payments", "Payment methods"], ["currency", "Currency"]] },
  { title: "Help", links: [["returns", "Returns and refunds"], ["safety", "Product safety notices"], ["help", "Help center"]] },
]
