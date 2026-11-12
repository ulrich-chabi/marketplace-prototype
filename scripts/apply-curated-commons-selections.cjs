const fs = require("node:fs/promises")
const path = require("node:path")

async function main() {
const root = path.resolve(__dirname, "..")
const manifestPath = path.join(root, "storefront/src/data/demo-images.json")
const catalog = JSON.parse(await fs.readFile(manifestPath, "utf8"))

// Named Commons files were checked for a direct visual match to these products.
const choices = {
  "home-kitchen-3": "Griswold cast iron skillet.jpg",
  "toys-games-2": "The Wavelength party game box and elements 02.jpg",
  "sports-outdoors-1": "Yoga mat.jpg",
  "health-household-5": "Sponge-viscose.jpg",
  "pet-supplies-2": "XXL 4 Stamm Kratzbaum von CATHOME.jpg",
  "pet-supplies-3": "Dog sleeping in a dog bed.JPG",
  "garden-outdoor-3": "Planter box and plants by Brayton elementary school students in Summit NJ.jpg",
  "garden-outdoor-5": "Green watering cans.jpg",
  "baby-1": "Realistic FM Cordless Room Monitor.jpg",
  "baby-5": "A diaper bag outside.jpg",
  "arts-crafts-1": "Set of watercolor paints - Ariel Waldman.jpg",
  "arts-crafts-5": "Kit, sewing (AM 607154-1).jpg",
  "musical-instruments-4": "Electronic drum.jpg",
  "video-games-2": "Logitech G733 and Twitch Headphone Stand at K7 Entertainment live studio 20251004.jpg",
  "video-games-3": "Gaming chair.jpg",
  "video-games-4": "PlayStation Move - Base.jpg",
}

const accepted = /^(CC0|Public domain|Public Domain Mark|No restrictions|CC BY(?:-SA)? [234]\.0(?: [A-Za-z-]+)?)$/i
const headers = { "User-Agent": "MarketplacePrototype/1.0 (https://github.com/ulrich-chabi/marketplace-prototype)" }
const used = new Set(Object.entries(catalog).filter(([key]) => !choices[key]).map(([, item]) => item.source))

for (const [key, title] of Object.entries(choices)) {
  const query = new URLSearchParams({ action: "query", titles: `File:${title}`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1200", format: "json" })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, { headers })
  if (!response.ok) throw new Error(`Commons lookup failed (${response.status}) for ${title}`)
  const result = await response.json()
  const page = Object.values(result.query?.pages ?? {})[0]
  const image = page?.imageinfo?.[0]
  if (!image) throw new Error(`No Commons image metadata for ${title}`)
  const license = image.extmetadata?.LicenseShortName?.value?.replace(/<[^>]*>/g, "").trim()
  if (!accepted.test(license ?? "")) throw new Error(`Unsupported license for ${title}: ${license}`)
  if (used.has(image.descriptionurl)) throw new Error(`Duplicate image source for ${title}`)
  const item = catalog[key]
  item.title = title
  item.author = image.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() ?? ""
  item.license = license
  item.source = image.descriptionurl
  item.download = image.thumburl ?? image.url
  used.add(item.source)
  console.log(`Curated ${key}: ${title} (${license})`)
  await new Promise((resolve) => setTimeout(resolve, 400))
}

await fs.writeFile(manifestPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
