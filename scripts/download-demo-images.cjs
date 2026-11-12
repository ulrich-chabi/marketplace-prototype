const { createRequire } = require("node:module")
const { access, mkdir, readFile } = require("node:fs/promises")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const storefrontRequire = createRequire(path.join(root, "storefront", "package.json"))
const sharp = storefrontRequire("sharp")
const sourceFile = path.join(root, "storefront", "src", "data", "demo-images.json")
const outputDir = path.join(root, "storefront", "public", "images", "catalog")
const force = process.argv.includes("--force")

async function main() {
  const assets = JSON.parse(await readFile(sourceFile, "utf8"))
  await mkdir(outputDir, { recursive: true })

  for (const [category, asset] of Object.entries(assets)) {
    const outputPath = path.join(outputDir, `${category}.webp`)
    try {
      await access(outputPath)
      if (!force) continue
    } catch {}
    const response = await fetch(asset.download, {
      headers: { "User-Agent": "MarketplacePrototype/1.0 (https://github.com/ulrich-chabi/marketplace-prototype)" },
    })
    if (!response.ok) throw new Error(`Image download failed for ${category}: HTTP ${response.status}`)
    const input = Buffer.from(await response.arrayBuffer())
    await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(800, 600, { fit: "cover", position: "attention" })
      .webp({ quality: 84, effort: 5 })
      .toFile(outputPath)
    process.stdout.write(`Prepared ${category}: ${input.length} source bytes\n`)
    await new Promise((resolve) => setTimeout(resolve, 900))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
