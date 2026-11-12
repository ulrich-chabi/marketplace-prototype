import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { DEPARTMENTS } from "../seed-data"

const images = JSON.parse(
  readFileSync(resolve(process.cwd(), "../storefront/src/data/demo-images.json"), "utf8")
) as Record<string, { productType: string; category: string; source: string; license: string }>

describe("catalogue de démonstration", () => {
  it("associe chaque produit semé à une photo distincte et créditée", () => {
    expect(DEPARTMENTS).toHaveLength(20)

    for (const department of DEPARTMENTS) {
      const seededTypes = department.types.slice(0, department.imageCount)
      expect(new Set(seededTypes).size).toBe(seededTypes.length)

      for (let index = 0; index < department.imageCount; index++) {
        const key = `${department.handle}-${index + 1}`
        const image = images[key]
        expect(image).toBeDefined()
        expect(image.productType).toBe(department.types[index])
        expect(image.category).toBe(department.name)
        expect(image.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
        expect(image.license).toBeTruthy()
      }

      expect(Object.keys(images).filter((key) => key.startsWith(`${department.handle}-`))).toHaveLength(
        department.imageCount
      )
    }
  })
})
