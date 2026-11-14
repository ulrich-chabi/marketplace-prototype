// Données de démonstration. TOUT est fictif : marques inventées, aucun avis,
// aucune note, aucun chiffre de vente. Toute ressemblance avec une marque
// existante serait fortuite : à faire vérifier avant toute diffusion publique.

export type Department = {
  name: string
  handle: string
  priceMin: number
  priceMax: number
  maxProducts: number
  types: string[]
}

export const DEPARTMENTS: Department[] = [
  { name: "Electronics", handle: "electronics", priceMin: 15, priceMax: 600, maxProducts: 12, types: ["Wireless Headphones", "Bluetooth Speaker", "Smart Watch", "Portable Charger", "Desk Lamp", "Webcam", "Action Camera", "E-Reader", "Fitness Tracker", "Home Security Camera", "Soundbar", "Smart Plug"] },
  { name: "Computers", handle: "computers", priceMin: 12, priceMax: 900, maxProducts: 12, types: ["Laptop", "Mechanical Keyboard", "Wireless Mouse", "Monitor", "USB-C Hub", "External SSD", "Laptop Stand", "Docking Station", "Graphics Tablet", "Router", "Webcam Cover Set", "Laptop Sleeve"] },
  { name: "Home & Kitchen", handle: "home-kitchen", priceMin: 8, priceMax: 250, maxProducts: 12, types: ["Electric Kettle", "Chef Knife", "Cast Iron Skillet", "Blender", "Coffee Grinder", "Storage Containers", "Cutting Board", "Dish Rack", "Toaster", "Air Fryer", "Mixing Bowls", "Food Scale"] },
  { name: "Fashion", handle: "fashion", priceMin: 10, priceMax: 180, maxProducts: 12, types: ["Cotton T-Shirt", "Denim Jacket", "Running Shoes", "Wool Scarf", "Leather Belt", "Rain Jacket", "Backpack", "Canvas Sneakers", "Knit Dress", "Sunglasses", "Wallet", "Cap"] },
  { name: "Books", handle: "books", priceMin: 6, priceMax: 45, maxProducts: 12, types: ["Cookbook", "Travel Guide", "Science Primer", "Mystery Novel", "Gardening Handbook", "History Atlas", "Poetry Anthology", "Programming Guide", "Art Monograph", "Biography", "Puzzle Book", "Children's Storybook"] },
  { name: "Toys & Games", handle: "toys-games", priceMin: 6, priceMax: 120, maxProducts: 12, types: ["Building Blocks Set", "Board Game", "Jigsaw Puzzle", "Plush Animal", "Remote Control Car", "Card Game", "Wooden Train Set", "Science Kit", "Play Dough Set", "Art Easel", "Chess Set", "Kite"] },
  { name: "Sports & Outdoors", handle: "sports-outdoors", priceMin: 8, priceMax: 300, maxProducts: 12, types: ["Yoga Mat", "Camping Tent", "Water Bottle", "Trekking Poles", "Resistance Bands", "Sleeping Bag", "Bike Helmet", "Dumbbell Set", "Hiking Backpack", "Jump Rope", "Headlamp", "Foam Roller"] },
  { name: "Beauty & Personal Care", handle: "beauty-personal-care", priceMin: 5, priceMax: 90, maxProducts: 12, types: ["Foundation Primer", "Hair Dryer", "Electric Toothbrush", "Body Lotion", "Shaving Kit", "Hair Brush", "Nail Care Set", "Sunscreen", "Lip Balm Set", "Cleansing Oil", "Makeup Bag", "Bath Salts"] },
  { name: "Health & Household", handle: "health-household", priceMin: 4, priceMax: 120, maxProducts: 12, types: ["Humidifier", "Laundry Detergent", "First Aid Kit", "Air Purifier", "Reusable Sponges", "Pill Organizer", "Thermometer", "Hand Soap Refill", "Trash Bags", "Dish Soap", "Cleaning Cloths", "Vitamin Organizer"] },
  { name: "Grocery", handle: "grocery", priceMin: 3, priceMax: 60, maxProducts: 12, types: ["Olive Oil", "Pasta Selection", "Ground Coffee", "Loose Leaf Tea", "Granola", "Honey", "Spice Set", "Dark Chocolate", "Rice Pack", "Trail Mix", "Hot Sauce", "Dried Fruit Box"] },
  { name: "Pet Supplies", handle: "pet-supplies", priceMin: 5, priceMax: 140, maxProducts: 12, types: ["Dog Leash", "Cat Tree", "Pet Bed", "Chew Toy", "Interactive Cat Toy", "Automatic Feeder", "Aquarium Filter", "Bird Feeder", "Cat Scratcher", "Grooming Brush", "Water Fountain", "Training Treats Pouch"] },
  { name: "Automotive", handle: "automotive", priceMin: 6, priceMax: 280, maxProducts: 12, types: ["Phone Mount", "Jump Starter", "Car Seat Cover", "Tire Inflator", "Dash Camera", "Floor Mats", "Car Vacuum", "Wiper Blades", "Emergency Kit", "Trunk Organizer", "Microfiber Towels", "Sunshade"] },
  { name: "Tools & Home Improvement", handle: "tools-home-improvement", priceMin: 7, priceMax: 350, maxProducts: 12, types: ["Cordless Drill", "Screwdriver Set", "Tape Measure", "Chainsaw Safety Gloves", "Stud Finder", "Tool Box", "Laser Level", "Socket Set", "Utility Knife", "LED Work Light", "Paint Roller Kit", "Pliers Set"] },
  { name: "Office Products", handle: "office-products", priceMin: 4, priceMax: 200, maxProducts: 12, types: ["Notebook Set", "Standing Desk Mat", "Desk Organizer", "Gel Pens", "Paper Shredder", "Label Maker", "Whiteboard", "Ergonomic Chair Cushion", "Stapler", "File Folders", "Planner", "Document Scanner"] },
  { name: "Garden & Outdoor", handle: "garden-outdoor", priceMin: 6, priceMax: 260, maxProducts: 12, types: ["Garden Hose", "Pruning Shears", "Planter Box", "Solar Lights", "Watering Can", "Compost Bin", "Bird Bath", "Patio Chair", "Garden Gloves", "Wheelbarrow", "Seed Starter Kit", "Hammock"] },
  { name: "Baby", handle: "baby", priceMin: 6, priceMax: 220, maxProducts: 12, types: ["Baby Monitor", "Compact Baby Stroller", "Muslin Blankets", "Bottle Set", "Diaper Bag", "Bath Tub", "Play Mat", "High Chair", "Teething Toys", "Nursery Night Light", "Swaddle Set", "Bib Pack"] },
  { name: "Arts & Crafts", handle: "arts-crafts", priceMin: 4, priceMax: 110, maxProducts: 12, types: ["Watercolor Set", "Sketchbook", "Knitting Kit", "Acrylic Paint Set", "Sewing Kit", "Craft Scissors", "Pottery Tools", "Embroidery Hoops", "Colored Pencils", "Glue Gun", "Origami Paper", "Calligraphy Set"] },
  { name: "Musical Instruments", handle: "musical-instruments", priceMin: 9, priceMax: 450, maxProducts: 12, types: ["Acoustic Guitar", "Ukulele", "Electronic Keyboard", "Drum Pad", "Harmonica Set", "Guitar Tuner", "Music Stand", "Cajon", "Violin Starter Kit", "Microphone", "Capo", "Metronome"] },
  { name: "Video Games", handle: "video-games", priceMin: 8, priceMax: 160, maxProducts: 12, types: ["Game Controller", "Headset Stand", "Gaming Chair Cushion", "Charging Dock", "Controller Grips", "Racing Wheel", "Capture Card", "Mouse Pad", "Console Stand", "Memory Card", "Thumbstick Covers", "Cable Organizer"] },
  { name: "Movies & Hobbies", handle: "movies-hobbies", priceMin: 6, priceMax: 140, maxProducts: 12, types: ["Model Aircraft Kit", "Binoculars", "Telescope", "Photo Album", "Magnifying Lamp", "Puzzle Mat", "Collector Display Case", "Star Map", "Film Poster Frame", "Hobby Tool Set", "Craft Storage Box", "Pocket Microscope"] },
]

export function countAvailableDemoProducts(
  department: Department,
  images: Record<string, unknown>,
  requestedCount = department.maxProducts
) {
  const limit = Math.min(requestedCount, department.maxProducts, department.types.length)
  let count = 0
  while (count < limit && images[`${department.handle}-${count + 1}`]) count += 1
  return count
}

export const BRANDS = [
  "Norvik", "Alder & Co", "Brisa", "Quillon", "Tarvane", "Meridale", "Velkor", "Pinnacre",
  "Lowrie", "Sundale", "Fernhollow", "Kestrel Row", "Oakmere", "Ravenly", "Tamsin Lane", "Wexford Hill",
]

export const COLORS = ["Black", "White", "Sand", "Teal", "Terracotta", "Slate", "Forest", "Navy"]

// Vendeurs, politiques et adresses d'expédition FICTIFS, réservés au seed de démonstration.
export const VENDORS = [
  { name: "Marketplace Direct", handle: "marketplace-direct", deliveryMin: 2, deliveryMax: 3, returnDays: 30, shippingOrigin: { address_1: "100 Demo Harbour Road", city: "Toronto", province: "ON", postal_code: "M5V 0A1", phone: "+1 416-555-0101" } },
  { name: "Harbor & Pine", handle: "harbor-pine", deliveryMin: 3, deliveryMax: 5, returnDays: 30, shippingOrigin: { address_1: "200 Fictional Cedar Avenue", city: "Vancouver", province: "BC", postal_code: "V6B 0A2", phone: "+1 604-555-0102" } },
  { name: "Lumen Supply Co", handle: "lumen-supply", deliveryMin: 4, deliveryMax: 7, returnDays: 14, shippingOrigin: { address_1: "300 Sample Prairie Lane", city: "Calgary", province: "AB", postal_code: "T2P 0A3", phone: "+1 403-555-0103" } },
  { name: "Northfield Goods", handle: "northfield-goods", deliveryMin: 5, deliveryMax: 8, returnDays: 30, shippingOrigin: { address_1: "400 Demo Exchange Street", city: "Winnipeg", province: "MB", postal_code: "R3C 0A4", phone: "+1 204-555-0104" } },
  { name: "Cobalt Market", handle: "cobalt-market", deliveryMin: 2, deliveryMax: 4, returnDays: 15, shippingOrigin: { address_1: "500 Example Canal Road", city: "Ottawa", province: "ON", postal_code: "K1P 0A5", phone: "+1 613-555-0105" } },
  { name: "Juniper Lane", handle: "juniper-lane", deliveryMin: 6, deliveryMax: 9, returnDays: 30, shippingOrigin: { address_1: "600 Demo St-Laurent Avenue", city: "Montréal", province: "QC", postal_code: "H2Y 0A6", phone: "+1 514-555-0106" } },
  { name: "Saffron Street", handle: "saffron-street", deliveryMin: 3, deliveryMax: 6, returnDays: 7, shippingOrigin: { address_1: "700 Fictional Waterfront Drive", city: "Halifax", province: "NS", postal_code: "B3J 0A7", phone: "+1 902-555-0107" } },
] as const

// Générateur pseudo-aléatoire déterministe : même graine, mêmes données.
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Mesures fictives estimées : poids en kg, dimensions en cm. Démo de colis uniquement.
export function demoShippingMeasurements(category: string, index: number) {
  const base: Record<string, [number, number, number, number]> = {
    electronics: [0.42, 22, 16, 8], computers: [0.78, 32, 24, 8], "home-kitchen": [1.15, 30, 24, 16],
    fashion: [0.48, 32, 24, 8], books: [0.62, 24, 18, 5], "toys-games": [0.72, 28, 22, 12],
    "sports-outdoors": [1.1, 36, 26, 14], "beauty-personal-care": [0.38, 22, 16, 10],
    "health-household": [0.86, 28, 22, 14], grocery: [0.95, 24, 18, 12], "pet-supplies": [0.82, 30, 22, 14],
    automotive: [1.25, 32, 24, 14], "tools-home-improvement": [1.45, 32, 24, 12],
    "office-products": [0.68, 28, 22, 10], "garden-outdoor": [1.4, 36, 28, 16], baby: [0.9, 32, 24, 14],
    "arts-crafts": [0.55, 28, 22, 8], "musical-instruments": [1.3, 48, 20, 12],
    "video-games": [0.52, 24, 18, 8], "movies-hobbies": [0.76, 30, 22, 10],
  }
  const [weight, length, width, height] = base[category] ?? [0.7, 28, 20, 10]
  const n = Math.max(0, Math.floor(index))
  return { weight: Math.round((weight + (n % 5) * 0.11) * 1000) / 1000, length: length + (n % 3) * 2, width: width + (n % 4) * 1.5, height: height + (n % 3) }
}
