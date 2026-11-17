import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { countAvailableDemoProducts, demoShippingMeasurements, DEPARTMENTS } from "../seed-data"

const images = JSON.parse(
  readFileSync(resolve(process.cwd(), "../storefront/src/data/demo-images.json"), "utf8")
) as Record<string, { productType: string; category: string; source: string; license: string }>

describe("catalogue de démonstration", () => {
  it("produit des dimensions physiques positives et variées par rayon", () => {
    const electronics = demoShippingMeasurements("electronics", 0)
    const kitchen = demoShippingMeasurements("home-kitchen", 0)
    const nextItem = demoShippingMeasurements("electronics", 1)
    expect(electronics.weight).toBeGreaterThan(0)
    expect(electronics.length).toBeGreaterThan(0)
    expect(electronics).not.toEqual(kitchen)
    expect(electronics).not.toEqual(nextItem)
  })
  it("associe chaque produit semé à une photo distincte et créditée", () => {
    expect(DEPARTMENTS).toHaveLength(20)
    expect(new Set(Object.values(images).map((image) => image.source)).size).toBe(Object.keys(images).length)

    for (const department of DEPARTMENTS) {
      const seededTypes = department.types.slice(0, department.maxProducts)
      expect(new Set(seededTypes).size).toBe(seededTypes.length)

      const availablePhotos = countAvailableDemoProducts(department, images)
      expect(availablePhotos).toBeGreaterThan(0)

      for (let index = 0; index < availablePhotos; index++) {
        const key = `${department.handle}-${index + 1}`
        const image = images[key]
        expect(image).toBeDefined()
        expect(image.productType).toBe(department.types[index])
        expect(image.category).toBe(department.name)
        expect(image.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
        expect(image.license).toBeTruthy()
      }

      expect(Object.keys(images).filter((key) => key.startsWith(`${department.handle}-`))).toHaveLength(
        availablePhotos
      )
    }
  })

  it("limite le seed aux photos disponibles et arrête au premier trou", () => {
    const department = DEPARTMENTS[0]
    const sparseImages = { [`${department.handle}-1`]: {}, [`${department.handle}-3`]: {} }

    expect(countAvailableDemoProducts(department, sparseImages)).toBe(1)
    expect(countAvailableDemoProducts(department, images, 2)).toBe(2)
  })

  it("ajoute des fiches épicerie distinctes avec une photo propre", () => {
    const grocery = DEPARTMENTS.find((department) => department.handle === "grocery")!
    expect(countAvailableDemoProducts(grocery, images)).toBe(16)
    expect(images["grocery-10"]).toBeDefined()
    expect(images["grocery-11"]).toBeDefined()
    expect(images["grocery-12"]).toBeDefined()
    expect(images["grocery-13"]).toBeDefined()
    expect(images["grocery-13"].productType).toBe("Maple Syrup")
    expect(images["grocery-14"]).toBeDefined()
    expect(images["grocery-14"].productType).toBe("Oat Crackers")
    expect(images["grocery-15"]).toBeDefined()
    expect(images["grocery-15"].productType).toBe("Canned Tomato Pack")
    expect(images["grocery-16"].productType).toBe("Lentil Soup Mix")
  })

  it("complète les derniers accessoires informatiques et de bureau avec des photos dédiées", () => {
    const electronics = DEPARTMENTS.find((department) => department.handle === "electronics")!
    const computers = DEPARTMENTS.find((department) => department.handle === "computers")!
    const office = DEPARTMENTS.find((department) => department.handle === "office-products")!
    expect(countAvailableDemoProducts(electronics, images)).toBe(20)
    expect(images["electronics-20"].productType).toBe("HDMI Switch")
    expect(countAvailableDemoProducts(computers, images)).toBe(20)
    expect(images["computers-20"].productType).toBe("Laptop Privacy Screen")
    expect(countAvailableDemoProducts(office, images)).toBe(14)
    expect(images["office-products-14"].productType).toBe("Monitor Riser")
  })
})
