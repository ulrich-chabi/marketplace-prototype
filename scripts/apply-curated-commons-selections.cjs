const fs = require("node:fs/promises")
const path = require("node:path")

async function main() {
const root = path.resolve(__dirname, "..")
const manifestPath = path.join(root, "storefront/src/data/demo-images.json")
const catalog = JSON.parse(await fs.readFile(manifestPath, "utf8"))

// Named Commons files were checked for a direct visual match to these products.
const choices = {
  "computers-16": "OWC Thunderbolt 3 Dock.jpg",
  "computers-17": "Ring Light 25280737679.jpg",
  "electronics-16": "BenQ DLP projector MP515 20101213.jpg",
  "electronics-18": "LED strip on reel.jpg",
  "fashion-14": "Carape 2.jpg",
  "fashion-17": "Seto linen shirt (Saatse Museum).jpg",
  "garden-outdoor-14": "Melnor Garden Hose Water Nozzle 5 LR.jpg",
  "health-household-13": "Health o meter Bathroom Scale.JPG",
  "health-household-15": "2018-01-30-Fusselrolle.jpg",
  "sports-outdoors-14": "Fishing Basket.jpg",
  "tools-home-improvement-15": "ConstructionLight.jpg",
  "musical-instruments-14": "Guitar straps - Expomusic 2014.jpg",
  "musical-instruments-16": "LP Tambourine by MusicTales.jpg",
  "musical-instruments-17": "Piano stool MET 185012.jpg",
  "musical-instruments-18": "Drumstick of acustic, jazz and rock music styles isolated on a white background (28336839462).jpg",
  "musical-instruments-20": "Violin Bow MET 250535.jpg",
  "computers-1": "Lenovo G500s laptop-2903.jpg",
  "home-kitchen-4": "Pink portable blender.jpg",
  "grocery-3": "Union Hand-Roasted Coffee - Coffee Bag.jpg",
  "grocery-4": "Blackened tea leaves (Unsplash).jpg",
  "office-products-1": "Red Spiral-Bound Notebook.jpg",
  "office-products-2": "Industrial anti-fatigue mat with beveled edge and diamond plate texture.jpg",
  "movies-hobbies-4": "Family photo album - leather cover (8012042758).jpg",
  "fashion-1": "Green t-shirt and yellow t-shirt.png",
  "toys-games-1": "A pile of alphabet wooden blocks.jpg",
  "toys-games-4": "Old Teddy Bear.jpg",
  "toys-games-5": "RC-car.jpg",
  "health-household-2": "Liquid detergent.JPG",
  "grocery-2": "Pasta IMG 3985.JPG",
  "automotive-1": "Wikimedia Morocco Mini-Hackathon 2026 day 1 - Woman using laptop with mobile phone mount - 0022.jpg",
  "automotive-5": "Car Dashcam.jpg",
  "tools-home-improvement-3": "Stanley PowerLock tape measure on tool box.jpg",
  "garden-outdoor-1": "Great Swamp Greenhouse photos coiled watering hose close in.JPG",
  "garden-outdoor-4": "Path and solar lights - geograph.org.uk - 7148469.jpg",
  "baby-4": "Pappa Bottle, Mama Bottle, and Little Baby Bottle (4981165213).jpg",
  "arts-crafts-3": "Tempestry Kit Picture 16x9.png",
  "musical-instruments-3": "Casio CTK-496 keyboard.jpg",
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
  item.author = image.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "Author not listed"
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
