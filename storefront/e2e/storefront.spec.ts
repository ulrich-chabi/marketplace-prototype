import AxeBuilder from "@axe-core/playwright"
import { expect, Page, test } from "@playwright/test"

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

const price = (text: string) => Number(text.replace(/[^0-9.]/g, ""))
const cartLink = (page: Page) => page.getByRole("link", { name: /^Cart,/ })

// Première fiche du rayon qui a au moins 2 offres de vendeurs différents.
async function productWithOffers(page: Page, minSellers = 2) {
  await page.goto("/categories/electronics")
  const cards = page.locator("article")
  const n = await cards.count()
  for (let i = 0; i < n; i++) {
    const text = await cards.nth(i).innerText()
    const m = text.match(/(\d+) offers? from (\d+) sellers?/)
    if (m && Number(m[2]) >= minSellers) return cards.nth(i).getByRole("link").first().getAttribute("href")
  }
  throw new Error("Aucune fiche avec plusieurs vendeurs : le catalogue de démonstration est-il en place ?")
}

test.describe("Parcourir", () => {
  test("l'accueil présente les rayons et les nouveautés, et n'est pas indexable", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find it. Compare it. Know the total.")
    await expect(page.getByRole("heading", { name: "Shop by department" })).toBeVisible()
    expect(await page.locator("main a[href^='/categories/']").count()).toBeGreaterThanOrEqual(20)
    await expect(page.locator("article")).toHaveCount(5)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  })

  test("un rayon liste ses produits, et le logo ramène à l'accueil", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("navigation", { name: "Departments" }).getByRole("link", { name: "Electronics" }).click()
    await expect(page).toHaveURL(/\/categories\/electronics$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Electronics")
    expect(await page.locator("article").count()).toBeGreaterThan(0)
    await page.getByRole("link", { name: /^Logo/ }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test("la recherche trouve un produit et annonce l'absence de résultat", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("searchbox", { name: "Search products" }).fill("headphones")
    await page.getByRole("button", { name: "Search" }).click()
    await expect(page).toHaveURL(/q=headphones/)
    const titles = await page.locator("article h3").allInnerTexts()
    expect(titles.length).toBeGreaterThan(0)
    for (const t of titles) expect(t.toLowerCase()).toContain("headphones")

    await page.goto("/search?q=zzzzqq")
    await expect(page.getByText("No results.")).toBeVisible()
  })

  test("les filtres vendeur et prix et le tri se combinent, la pagination avance", async ({ page }) => {
    await page.goto("/search?vendor=harbor-pine&min_price=20&max_price=60&sort=price_asc")
    const prices = (await page.locator("article").getByText(/^From \$/).allInnerTexts()).map(price)
    expect(prices.length).toBeGreaterThan(1)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    for (const p of prices) {
      expect(p).toBeGreaterThanOrEqual(20)
      expect(p).toBeLessThanOrEqual(60)
    }

    await page.goto("/search")
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible()
    await page.getByRole("link", { name: "Next" }).click()
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible()
  })

  test("une page inconnue répond 404", async ({ page }) => {
    for (const url of ["/p/nope", "/categories/nope", "/legal/nope", "/nope"]) {
      const response = await page.goto(url)
      expect(response?.status(), url).toBe(404)
    }
  })

  test("le lien d'évitement est le premier élément accessible au clavier", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/#main$/)
  })
})

test.describe("Compte client", () => {
  test("propose inscription, connexion et suivi invité", async ({ page }) => {
    await page.goto("/account")
    await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Guest order tracking" })).toBeVisible()
    await expect(page.getByLabel("Private access code")).toHaveAttribute("type", "password")
  })
})

test.describe("Espace vendeur", () => {
  test("présente la connexion et le formulaire de candidature", async ({ page }) => {
    await page.goto("/sell")
    await expect(page.getByRole("heading", { name: "Seller space" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Seller sign in" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Apply to sell" })).toBeVisible()
    await expect(page.getByLabel("Store name")).toBeVisible()
    await page.getByRole("link", { name: "Become a seller" }).click()
    await expect(page).toHaveURL(/\/sell$/)
  })
})

test.describe("Administration de plateforme", () => {
  test("présente un formulaire de connexion sans exposer le tableau de bord", async ({ page }) => {
    await page.goto("/platform")
    await expect(page.getByRole("heading", { name: "Platform operations" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Administrator sign in" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Seller applications and access" })).toHaveCount(0)
  })
})

test.describe("Fiche produit", () => {
  test("les offres sont triées par prix, sans offre mise en avant, avec livraison, retours et stock", async ({ page }) => {
    await page.goto((await productWithOffers(page))!)
    const rows = page.locator("tbody tr")
    expect(await rows.count()).toBeGreaterThanOrEqual(2)
    const prices = (await rows.locator("td:nth-child(3) span.text-lg").allInnerTexts()).map(price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    await expect(rows.first()).toContainText("Lowest price")
    await expect(page.getByText("No offer is promoted.")).toBeVisible()
    for (const column of ["Delivery", "Returns", "Availability"]) {
      await expect(page.getByRole("columnheader", { name: column })).toBeVisible()
    }
    await expect(rows.first()).toContainText(/business days/)
    await expect(rows.first()).toContainText(/-day returns|No returns/)
    await expect(rows.first()).toContainText(/In stock|Only \d+ left|Out of stock/)
    await expect(rows.first()).toContainText(/\+ \$\d+\.\d\d shipping/)
  })
})

test.describe("Panier", () => {
  test("ajoute des offres de deux vendeurs, groupe par vendeur, met à jour le compteur et supprime", async ({ page }) => {
    const url = (await productWithOffers(page))!
    await page.goto(url)
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 0 items")

    const first = page.locator("tbody tr").nth(0)
    await first.getByLabel(/^Quantity from/).selectOption("2")
    await first.getByRole("button", { name: /^Add to cart from/ }).click()
    await expect(page).toHaveURL(/\/cart\?added=1/)
    await expect(page.getByRole("status")).toHaveText("Added to cart.")
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 2 items")

    await page.goto(url)
    await page.locator("tbody tr").nth(1).getByRole("button", { name: /^Add to cart from/ }).click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 3 items")
    await expect(page.getByText("3 items from 2 sellers")).toBeVisible()
    await expect(page.getByRole("heading", { name: /^Sold by / })).toHaveCount(2)
    await expectNoA11yViolations(page)

    // Le panier survit à un rechargement de la page.
    await page.reload()
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 3 items")

    await page.getByRole("button", { name: /^Remove / }).first().click()
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 1 item")
    await page.getByRole("button", { name: /^Remove / }).first().click()
    await expect(page.getByText("Your cart is empty.")).toBeVisible()
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 0 items")
  })

  test("l'ajout au clavier fonctionne", async ({ page }) => {
    await page.goto((await productWithOffers(page, 1))!)
    const button = page.locator("tbody tr").first().getByRole("button", { name: /^Add to cart from/ })
    await button.focus()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/cart\?added=1/)
  })

  test("un panier vide est expliqué", async ({ page }) => {
    await page.goto("/cart")
    await expect(page.getByText("Your cart is empty.")).toBeVisible()
  })

  test("affiche les frais avant commande et termine le paiement simulé", async ({ page }) => {
    await page.goto((await productWithOffers(page, 1))!)
    await page.locator("tbody tr").first().getByRole("button", { name: /^Add to cart from/ }).click()
    await page.getByRole("link", { name: "Continue to checkout" }).click()
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible()
    await expect(page.getByText(/Payment is simulated/)).toBeVisible()
    await expect(page.getByText("Shipping (1 package)")).toBeVisible()
    await expectNoA11yViolations(page)

    await page.getByLabel("Email address").fill("demo-buyer@example.test")
    await page.getByLabel("First name").fill("Demo")
    await page.getByLabel("Last name").fill("Buyer")
    await page.getByLabel("Street address").fill("1 Fictional Street")
    await page.getByLabel("City").fill("Austin")
    await page.getByLabel("State").fill("TX")
    await page.getByLabel("ZIP code").fill("78701")
    await page.getByRole("button", { name: "Place demo order" }).click()
    await expect(page.getByRole("heading", { name: "Demo order placed" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Save this private order access code")).toBeVisible()
    await expect(cartLink(page)).toHaveAccessibleName("Cart, 0 items")
    await page.getByRole("link", { name: "View order status" }).click()
    await expect(page.getByRole("heading", { name: /^Your demo order #/ })).toBeVisible()
    await expect(page.getByText("Shipping status")).toBeVisible()
    await page.getByRole("button", { name: "Request return" }).click()
    await expect(page.getByRole("status")).toContainText("sent to the platform for review")
  })
})

test.describe("Comparateur", () => {
  const bar = (page: Page) => page.getByRole("region", { name: "Product comparison" })
  const boxes = (page: Page) => page.getByRole("checkbox", { name: /^Compare/ })

  test("sélectionne jusqu'à 4 produits, compare, retire une colonne, garde la sélection entre les pages", async ({ page }) => {
    await page.goto("/categories/electronics")
    await expect(bar(page)).toHaveCount(0)
    for (let i = 0; i < 3; i++) await boxes(page).nth(i).check()
    await expect(bar(page)).toContainText("3 of 4 products selected")
    await boxes(page).nth(3).check()
    await expect(bar(page)).toContainText("4 of 4 products selected (limit reached)")
    await expect(boxes(page).nth(4)).toBeDisabled()

    await page.goto("/categories/books")
    await expect(bar(page)).toContainText("4 of 4 products selected")

    await bar(page).getByRole("link", { name: "Compare" }).click()
    await expect(page).toHaveURL(/\/compare\?/)
    await expect(page.locator("thead th")).toHaveCount(4)
    await expect(page.getByText("Lowest of these")).toHaveCount(1)
    await expectNoA11yViolations(page)

    await page.getByRole("link", { name: "Remove from comparison" }).first().click()
    await expect(page.locator("thead th")).toHaveCount(3)
    await expect(bar(page)).toContainText("3 of 4 products selected")

    await bar(page).getByRole("button", { name: "Clear selection" }).click()
    await expect(bar(page)).toHaveCount(0)
  })

  test("moins de deux produits : message d'aide", async ({ page }) => {
    await page.goto("/compare?h=nope&h=nope2")
    await expect(page.getByText(/Select at least 2 products/)).toBeVisible()
  })
})

test.describe("Accessibilité (WCAG 2.2 A et AA, contrôle automatique)", () => {
  test("pages principales", async ({ page }) => {
    const product = (await productWithOffers(page))!
    for (const url of ["/", "/departments", "/categories/books", "/search?q=guide", "/search?q=zzzzqq", product, "/legal/terms", "/legal/returns", "/sell", "/platform", "/cart", "/nope"]) {
      await page.goto(url)
      await expectNoA11yViolations(page)
    }
  })
})
