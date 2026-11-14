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
const unsuitable = /\b(chart|concept|diagram|girl|boy|woman|man|person|people|painting|museum|tornado|survey|screenshot|logo|icon|library|shelf|park|shadow|interior|field|poster|still|sale|customer|shows|staff|sergeant|exhibit|post[- ]medieval|\d{2}th century|vlt|beam pattern|radio|dpla|fema|graffiti|souvenir|victories|armed forces|oil wells?|film frame|riot|red square|planner working)\b/i
const headers = { "User-Agent": "MarketplacePrototype/1.0 (https://github.com/ulrich-chabi/marketplace-prototype)" }
// Libellés alternatifs employés dans les catalogues et titres Wikimedia Commons.
// La sélection reste fondée sur les mots recherchés, les dimensions et la licence.
const searchAliases: Record<string, string[]> = {
  "Webcam Cover Set": ["webcam privacy cover", "laptop camera cover"],
  "Laptop Sleeve": ["laptop case sleeve", "notebook computer sleeve"],
  "Science Kit": ["chemistry set", "science experiment kit"],
  "Play Dough Set": ["play dough modelling clay", "modeling clay set"],
  "Art Easel": ["painting easel", "artist easel"],
  "Chess Set": ["chess board pieces", "chess set"],
  Kite: ["flying kite", "kite flying"],
  "Lip Balm Set": ["lip balm", "lip salve"],
  "Cleansing Oil": ["facial cleansing oil", "oil cleanser skincare", "facial oil bottle"],
  "Makeup Bag": ["cosmetic bag", "toiletry makeup pouch"],
  "Bath Salts": ["bath salt crystals", "bath salts"],
  "Training Treats Pouch": ["dog training treat pouch", "dog treat bag training"],
  "Trunk Organizer": ["car cargo organizer", "car trunk storage organizer"],
  "Microfiber Towels": ["microfiber cleaning cloth", "microfibre cloth"],
  Sunshade: ["car windshield sun shade", "automobile sunshade"],
  "Ergonomic Chair Cushion": ["ergonomic seat cushion", "chair cushion"],
  Stapler: ["office stapler", "desktop stapler"],
  "File Folders": ["office file folder", "document folders"],
  Planner: ["paper day planner", "weekly planner notebook", "bound agenda planner"],
  "Document Scanner": ["desktop document scanner", "portable document scanner"],
  "Teething Toys": ["silicone baby teether", "baby teething ring toy"],
  "Nursery Night Light": ["baby night light nursery", "children nightlight"],
  "Swaddle Set": ["baby swaddle blanket", "infant swaddling cloth"],
  "Bib Pack": ["baby bib", "infant bibs"],
  "Thumbstick Covers": ["joystick thumbstick caps", "game controller thumb grips"],
  "Cable Organizer": ["cable management organizer", "cord organizer"],
  "Collector Display Case": ["collectible display case", "display cabinet collectibles"],
  "Star Map": ["star chart map", "astronomical star map"],
  "Film Poster Frame": ["movie poster frame", "cinema poster frame", "poster in picture frame"],
  "Hobby Tool Set": ["model making hobby tools", "hobby craft tool set"],
  "Craft Storage Box": ["craft supplies storage box", "arts crafts organizer"],
  "Pocket Microscope": ["portable handheld microscope", "pocket microscope"],
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
    const score = distinctiveTerms.filter((term) => titleWords.includes(canonicalWord(term))).length
    const license = clean(image?.extmetadata?.LicenseShortName?.value ?? "").replace(/\b 2\.0 at$/i, " 2.0 Austria")
    const source = String(image?.descriptionurl ?? "")
    return { image, title, normalizedTitle, titleWords, score, license, source }
  }).filter(({ image, title, normalizedTitle, titleWords, score, license, source }) => {
    const requiredMatches = distinctiveTerms.length === 1 ? 1 : 2
    return image && ["image/jpeg", "image/png", "image/webp"].includes(image.mime) &&
      image.width >= 500 && image.height >= 350 && acceptedLicense.test(license) &&
      source.startsWith("https://commons.wikimedia.org/wiki/File:") &&
      !usedSources.has(source) && !usedTitles.has(normalizedTitle) &&
      !unsuitable.test(title) && score >= requiredMatches
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
