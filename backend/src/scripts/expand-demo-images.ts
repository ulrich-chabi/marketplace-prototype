import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { DEPARTMENTS } from "./seed-data"

type ImageCredit = {
  file: string
  category: string
  productType: string
  alt: string
  title: string
  author: string
  license: string
  source: string
  download: string
}

const manifestPath = resolve(process.cwd(), "../storefront/src/data/demo-images.json")
const acceptedLicense = /^(CC0|Public domain|Public Domain Mark|No restrictions|CC BY(?:-SA)? [234]\.0(?: [A-Za-z-]+)?)$/i
const ignoredWords = new Set(["a", "an", "and", "for", "of", "the", "with", "set", "kit", "home", "outdoor", "book", "guide", "pack", "e"])
const unsuitable = /\b(chart|concept|diagram|girl|boy|woman|man|person|people|painting|museum|tornado|survey|screenshot|logo|icon|library|shelf|park|shadow|interior|field|poster|still|sale|customer|shows|staff|sergeant|exhibit|post[- ]medieval|\d{2}th century|vlt|beam pattern|radio|dpla|fema|graffiti|souvenir|victories|armed forces|oil wells?|film frame|riot|red square|planner working|model holding|auto show|car show|mounted as a pendant|when teething|teething patterns|amtrak station display case|touring car|lozier|greenwich)\b/i
const headers = { "User-Agent": "MarketplacePrototype/1.0 (https://github.com/ulrich-chabi/marketplace-prototype)" }
// Libellés alternatifs employés dans les catalogues et titres Wikimedia Commons.
// La sélection reste fondée sur les mots recherchés, les dimensions et la licence.
const searchAliases: Record<string, string[]> = {
  "Noise Cancelling Earbuds": ["noise cancelling earbuds", "wireless earbuds", "earbuds"],
  "Wi-Fi Range Extender": ["wi-fi range extender", "wifi extender", "wireless repeater"],
  "Digital Alarm Clock": ["digital alarm clock", "LED alarm clock"],
  "HDMI Switch": ["HDMI switch", "HDMI selector switch", "HDMI switcher"],
  "DLP Video Projector": ["DLP video projector", "BenQ projector"],
  "Laptop Cooling Pad": ["laptop cooling pad", "notebook cooler", "laptop cooler"],
  "Laptop Privacy Screen": ["laptop privacy screen", "notebook privacy filter", "computer privacy filter"],
  "Webcam Ring Light": ["webcam ring light", "ring light for webcam", "video conference ring light", "ring light"],
  "Ceramic Dinnerware": ["ceramic dinnerware", "ceramic plate set", "porcelain tableware"],
  "Water Filter Pitcher": ["water filter pitcher", "water filtration jug", "water filter jug"],
  "Hand-Knit Wool Socks": ["hand knit wool socks", "wool socks", "knitted socks"],
  "Smart LED Strip": ["smart LED strip lights", "LED strip lights", "LED strip"],
  "Reusable Coffee Filter": ["reusable coffee filter", "pour over coffee filter", "coffee filter"],
  "Fleece Vest": ["fleece vest jacket", "sleeveless fleece vest", "fleece waistcoat", "fleece vest"],
  "Nature Field Guide": ["nature field guide", "wildlife field guide", "nature guide book", "field guide book"],
  "Play Dough Set": ["play dough set", "play dough", "modeling dough", "play dough modelling clay", "plasticine modelling clay"],
  "Fishing Basket": ["fishing basket", "traditional fishing basket"],
  "Cleansing Oil": ["facial cleansing oil", "oil cleanser", "cleansing oil", "facial cleansing oil bottle", "cosmetic cleansing oil", "facial oil bottle"],
  "Digital Bathroom Scale": ["digital bathroom scale", "bathroom scale", "digital weight scale"],
  "Reusable Food Wrap": ["beeswax food wrap", "reusable food wrap", "beeswax wrap"],
  "Oat Crackers": ["oat crackers", "oatcake crackers", "crackers oats"],
  "Training Treats Pouch": ["dog training treat pouch", "dog treat pouch", "dog treat bag", "dog treat bag training", "dog treat pouch bag"],
  Planner: ["paper day planner", "daily planner book", "weekly planner notebook", "bound agenda planner", "diary planner book"],
  "Plant Support Stakes": ["garden plant support stakes", "plant support stake", "plant stakes", "tomato plant stakes"],
  "Teething Toys": ["baby teether", "teething ring", "infant teething toy", "silicone baby teether", "baby teething ring toy"],
  "Beading Kit": ["beading kit", "beading supplies", "bead craft kit"],
  "Thumbstick Covers": ["controller thumbstick caps", "thumbstick covers", "joystick thumb grips", "joystick thumbstick caps", "game controller thumb grips"],
  "Collector Display Case": ["collectible display case", "collectors display cabinet", "collectible case", "display cabinet collectibles", "model car display case"],
  "Bottle Warmer": ["baby bottle warmer", "infant bottle warmer"],
  "Baby Gate": ["baby safety gate", "child safety gate"],
  "Stroller Organizer": ["stroller organizer bag", "pushchair organizer"],
  "Infant Sleep Sack": ["baby sleep sack", "infant sleeping bag"],
  "Baby Nail Care Set": ["baby nail clippers", "infant nail care"],
  "Baby Carrier": ["soft baby carrier", "baby sling carrier"],
  "Changing Pad": ["baby changing pad", "portable changing mat"],
  "Crib Mobile": ["baby crib mobile", "crib hanging mobile"],
  "Magnetic Tiles": ["magnetic building tiles", "magnetic construction tiles"],
  "Marble Run Set": ["marble run toy", "marble track set"],
  "Puppet Theatre": ["children's puppet theater", "puppet theatre toy"],
  "Wooden Building Blocks": ["wooden toy blocks", "wooden building blocks"],
  "Toy Kitchen Set": ["children's toy kitchen", "play kitchen set"],
  "Foam Glider Plane": ["foam glider airplane", "foam toy glider"],
  "Stacking Rings": ["baby stacking rings toy", "stacking ring toy"],
  "Toy Drum": ["children's toy drum", "kids toy drum"],
  "Trunk Organizer": ["car trunk organizer", "car cargo organizer", "car trunk storage organizer", "vehicle trunk organizer", "car boot organizer"],
  "Microfiber Towels": ["microfiber cleaning cloth", "microfibre towel", "microfiber towel cloth", "microfibre towel cloth"],
  "Camping Fuel Canister": ["camping gas canister", "camping fuel cylinder", "camping stove gas cylinder"],
  "Caulking Gun": ["caulking gun tool", "sealant applicator gun", "caulk gun"],
  Sunshade: ["car windshield sunshade", "automobile sun shade", "automobile sunshade", "windshield sunshade"],
  "Battery Charger": ["car battery charger", "automotive battery charger"],
  "Roof Cargo Bag": ["car roof cargo bag", "vehicle rooftop cargo carrier"],
  "Car Wax Kit": ["car wax polish", "automotive car wax"],
  "Tire Pressure Gauge": ["tire pressure gauge", "tyre pressure gauge"],
  "Portable Air Compressor": ["portable tire inflator", "car air compressor"],
  "Steering Wheel Cover": ["automotive steering wheel cover", "car steering wheel cover"],
  "Snow Brush and Ice Scraper": ["snow brush ice scraper", "car ice scraper snow brush"],
  "Motorcycle Cover": ["motorcycle cover", "motorbike cover"],
  "Facial Cleanser": ["face cleanser bottle", "facial cleansing wash"],
  "Hair Styling Iron": ["hair straightener iron", "hair curling iron"],
  "Hand Cream": ["hand cream tube", "hand lotion"],
  "Bath Towel Set": ["bath towels folded", "towel set bathroom"],
  "Facial Roller": ["jade facial roller", "face massage roller"],
  "Body Scrub": ["body scrub jar", "sugar body scrub"],
  "Cotton Makeup Pads": ["cotton makeup remover pads", "cotton cosmetic pads"],
  "Travel Perfume Atomizer": ["perfume travel atomizer", "refillable perfume atomizer"],
  "Bilingual Phrasebook": ["bilingual phrasebook", "foreign language phrase book", "language phrase book", "travel phrasebook"],
  "Astronomy Handbook": ["astronomy handbook book", "astronomy guide book"],
  "Personal Finance Guide": ["personal finance book", "personal finance guide book"],
  "Architecture Monograph": ["architecture monograph book", "architecture book"],
  "Bird Identification Guide": ["bird identification field guide", "bird guide book"],
  "World History Textbook": ["world history textbook", "world history book"],
  "Short Story Collection": ["short story collection book", "short stories book"],
  "Model Train Set": ["model train set", "model railway set"],
  "Coin Album": ["coin collecting album", "coin album collection"],
  "Stamp Collecting Album": ["stamp collecting album", "stamp album"],
  "Birdwatching Field Glasses": ["birdwatching binoculars", "bird watching binoculars"],
  "Model Ship Kit": ["model ship kit", "ship model kit"],
  "Geology Rock Tumbler": ["rock tumbler polisher", "rock polishing tumbler"],
  "Portable Drawing Board": ["portable drawing board", "artist drawing board"],
  "Astronomy Star Chart": ["astronomy star chart", "star chart map"],
  "Webcam Cover Set": ["webcam privacy cover", "laptop camera cover"],
  "Laptop Sleeve": ["laptop protective sleeve", "notebook computer case", "laptop carrying case"],
  "Science Kit": ["chemistry set", "science experiment kit"],
  "Art Easel": ["painting easel", "artist easel"],
  "Chess Set": ["chess board pieces", "chess set"],
  Kite: ["flying kite", "kite flying"],
  "Lip Balm Set": ["lip balm", "lip salve"],
  "Makeup Bag": ["cosmetic bag", "toiletry makeup pouch"],
  "Bath Salts": ["bath salt crystals", "bath salts"],
  "Ergonomic Chair Cushion": ["ergonomic seat cushion", "chair cushion"],
  Stapler: ["office stapler", "desktop stapler"],
  "File Folders": ["office file folder", "document folders"],
  "Monitor Riser": ["computer monitor riser", "monitor stand riser", "desktop monitor stand"],
  "Document Scanner": ["desktop document scanner", "portable document scanner", "flatbed document scanner", "handheld scanner documents"],
  "Nursery Night Light": ["baby night light nursery", "children nightlight", "night light for nursery", "baby nightlight", "nursery nightlight"],
  "Swaddle Set": ["baby swaddle blanket", "infant swaddling cloth", "muslin swaddle baby"],
  "Bib Pack": ["baby feeding bib", "infant bibs cloth", "baby bibs"],
  "Cable Organizer": ["cable management organizer", "cord organizer", "cable organizer clips"],
  "Star Map": ["star chart map", "astronomical star map"],
  "Film Poster Frame": ["movie poster frame", "cinema poster frame", "poster in picture frame", "framed movie poster"],
  "Hobby Tool Set": ["model making hobby tools", "hobby craft tool set", "model airplane tool set"],
  "Craft Storage Box": ["craft supplies storage box", "arts crafts organizer", "craft storage container box"],
  "Pocket Microscope": ["portable handheld microscope", "pocket microscope", "portable digital microscope"],
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, ImageCredit>
  const usedSources = new Set(Object.values(manifest).map((image) => image.source))
  const usedTitles = new Set(Object.values(manifest).map((image) => normalize(image.title)))

  for (const department of DEPARTMENTS) {
    let nextIndex = 0
    while (nextIndex < department.maxProducts && manifest[`${department.handle}-${nextIndex + 1}`]) nextIndex += 1
    if (nextIndex >= department.maxProducts) continue

    for (let index = nextIndex; index < department.maxProducts; index += 1) {
      const productType = department.types[index]
      let selected: Awaited<ReturnType<typeof findLicensedPhoto>> = null
      const aliases = searchAliases[productType] ?? []
      const searches = aliases.length && productType.trim().split(/\s+/).length === 1
        ? aliases
        : [...aliases, productType]
      for (const alternative of searches) {
        await delay(200)
        selected = await findLicensedPhoto(alternative, usedSources, usedTitles)
        if (selected) break
      }
      if (!selected) {
        console.log(`Aucune photo suffisamment pertinente trouvée pour ${department.name} / ${productType}; les prochains produits de ce rayon attendront pour conserver l’ordre des images.`)
        break
      }

      const key = `${department.handle}-${index + 1}`
      manifest[key] = {
        file: `/images/catalog/${key}.webp`,
        category: department.name,
        productType,
        alt: `Illustrative photo of ${productType}; fictional demo listing`,
        ...selected,
      }
      usedSources.add(selected.source)
      usedTitles.add(normalize(selected.title))
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
      console.log(`Ajouté ${key}: ${selected.title} (${selected.license})`)
      await delay(450)
    }
  }

  const consecutive = DEPARTMENTS.map((department) => {
    let count = 0
    while (count < department.maxProducts && manifest[`${department.handle}-${count + 1}`]) count += 1
    return `${department.name}: ${count}/${department.maxProducts}`
  })
  console.log(`Photos liées à un produit : ${Object.keys(manifest).length}.\n${consecutive.join("\n")}`)
}

async function findLicensedPhoto(productType: string, usedSources: Set<string>, usedTitles: Set<string>) {
  const distinctiveTerms = productType.toLowerCase().split(/[^a-z0-9]+/).filter((word) => !ignoredWords.has(word))
  const query = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "40",
    // La recherche sans guillemets laisse remonter les variantes de nom usuelles
    // (par ex. « train set » ou « model railway ») utilisées dans les titres Commons.
    gsrsearch: productType,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1280",
    format: "json",
  })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, { headers })
  if (!response.ok) throw new Error(`Wikimedia Commons HTTP ${response.status} pour « ${productType} ».`)
  const result = await response.json() as any
  const candidates = Object.values(result.query?.pages ?? {}) as any[]

  const ranked = candidates.map((page) => {
    const image = page.imageinfo?.[0]
    const title = String(page.title ?? "").replace(/^File:/, "")
    const normalizedTitle = normalize(title)
    const titleWords = normalizedTitle.split(" ").map(canonicalWord)
    const positions = distinctiveTerms.map((term) => titleWords.indexOf(canonicalWord(term)))
    const score = positions.filter((position) => position >= 0).length
    const presentPositions = positions.filter((position) => position >= 0)
    const titleSpan = presentPositions.length ? Math.max(...presentPositions) - Math.min(...presentPositions) : Infinity
    const license = clean(image?.extmetadata?.LicenseShortName?.value ?? "").replace(/\b 2\.0 at$/i, " 2.0 Austria")
    const source = String(image?.descriptionurl ?? "")
    return { image, title, normalizedTitle, titleWords, score, titleSpan, license, source }
  }).filter(({ image, title, normalizedTitle, score, titleSpan, license, source }) => {
    const requiredMatches = distinctiveTerms.length
    return image && ["image/jpeg", "image/png", "image/webp"].includes(image.mime) &&
      image.width >= 500 && image.height >= 350 && acceptedLicense.test(license) &&
      source.startsWith("https://commons.wikimedia.org/wiki/File:") &&
      !usedSources.has(source) && !usedTitles.has(normalizedTitle) &&
      !unsuitable.test(title) && score >= requiredMatches && titleSpan <= Math.max(2, distinctiveTerms.length + 1)
  }).sort((a, b) => b.score - a.score)

  const image = ranked[0]
  if (!image) return null
  const author = clean(image.image.extmetadata?.Artist?.value ?? "Author not listed") || "Author not listed"
  const download = String(image.image.thumburl ?? image.image.url ?? "")
  if (!download.startsWith("https://upload.wikimedia.org/") && !download.startsWith("https://thumb.wikimedia.org/")) return null
  return { title: image.title, author, license: image.license, source: image.source, download }
}

function normalize(value: string) {
  return value.toLocaleLowerCase("en").replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, " ").trim()
}

function canonicalWord(value: string) {
  if (value.endsWith("ies") && value.length > 4) return `${value.slice(0, -3)}y`
  if (value.endsWith("s") && value.length > 3 && !value.endsWith("ss")) return value.slice(0, -1)
  return value
}

function clean(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&#x0*27;/gi, "'").replace(/\s+/g, " ").trim()
}

function delay(milliseconds: number) {
  return new Promise((done) => setTimeout(done, milliseconds))
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
