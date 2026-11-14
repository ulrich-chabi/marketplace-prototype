import { createHash } from "node:crypto"
import { readFile, realpath } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const manifestPath = path.join(projectDir, "src/data/demo-images.json")
const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
const publicDir = await realpath(path.join(projectDir, "public"))
const files = new Set()
const sources = new Set()
const hashes = new Set()
const productTypesByCategory = new Map()

for (const [key, image] of Object.entries(manifest)) {
  if (!image.file?.startsWith("/images/catalog/")) throw new Error(`${key}: chemin d'image invalide`)
  if (image.file !== `/images/catalog/${key}.webp`) throw new Error(`${key}: le nom du fichier ne correspond pas à la fiche`)
  if (!image.source?.startsWith("https://commons.wikimedia.org/wiki/File:")) throw new Error(`${key}: source Commons absente`)
  if (!image.title || !image.author || !image.license || !image.productType || !image.category) {
    throw new Error(`${key}: informations de crédit ou de produit incomplètes`)
  }
  if (!/^(CC BY(-SA)? [0-9.]+(?: Austria)?|CC0|Public domain|No restrictions)$/.test(image.license)) {
    throw new Error(`${key}: licence non reconnue (${image.license})`)
  }
  if (files.has(image.file)) throw new Error(`${key}: fichier déjà associé à un autre produit`)
  if (sources.has(image.source)) throw new Error(`${key}: source déjà utilisée par une autre fiche`)
  const productTypes = productTypesByCategory.get(image.category) ?? new Set()
  if (productTypes.has(image.productType)) throw new Error(`${key}: type de produit déjà utilisé dans ${image.category}`)
  productTypes.add(image.productType)
  productTypesByCategory.set(image.category, productTypes)
  files.add(image.file)
  sources.add(image.source)

  const filePath = await realpath(path.join(publicDir, image.file.slice(1)))
  if (!filePath.startsWith(`${publicDir}${path.sep}`)) throw new Error(`${key}: l'image sort du dossier public`)
  const bytes = await readFile(filePath)
  const hash = createHash("sha256").update(bytes).digest("hex")
  if (hashes.has(hash)) throw new Error(`${key}: contenu identique à une autre image`)
  hashes.add(hash)

  const metadata = await sharp(bytes).metadata()
  if (metadata.format !== "webp" || metadata.width !== 800 || metadata.height !== 600) {
    throw new Error(`${key}: format ou dimensions incorrects (${metadata.format}, ${metadata.width}x${metadata.height})`)
  }
}

console.log(`${files.size} images vérifiées pour ${productTypesByCategory.size} rayons : dimensions 800×600, fiches et sources distinctes, crédits et licences présents.`)
