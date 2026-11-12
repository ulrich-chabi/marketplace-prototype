import type { Metadata } from "next"
import Link from "next/link"
import demoImages from "@/data/demo-images.json"

export const metadata: Metadata = { title: "Photo credits" }

function licenseUrl(license: string) {
  const version = license.match(/\d+\.\d+/)?.[0]
  if (license.startsWith("CC BY-SA") && version) return `https://creativecommons.org/licenses/by-sa/${version}/`
  if (license.startsWith("CC BY") && version) return `https://creativecommons.org/licenses/by/${version}/`
  if (license === "CC0") return "https://creativecommons.org/publicdomain/zero/1.0/"
  return "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia"
}

export default function ImageCreditsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="text-sm underline">Back to marketplace</Link>
      <h1 className="mt-4 font-serif text-3xl">Photo credits and licences</h1>
      <p className="mt-3 max-w-3xl text-muted">
        These catalogue photos come from Wikimedia Commons. Each file is cropped to a 4:3 frame and converted to WebP for this prototype. The photos are illustrative and do not identify or guarantee the exact item in a listing.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {Object.entries(demoImages).map(([key, image]) => (
          <li key={key} className="rounded-2xl border border-sand bg-white p-4">
            <h2 className="font-semibold">{image.productType} <span className="text-sm font-normal text-muted">· {image.category}</span></h2>
            <p className="mt-1">{image.title}</p>
            <p className="mt-1 text-sm text-muted">Creator: {image.author || "Not specified"}</p>
            <p className="mt-1 text-sm">
              Licence: <a className="underline" href={licenseUrl(image.license)} target="_blank" rel="noreferrer">{image.license}</a>
              {image.author && image.license.startsWith("CC BY") && <> · Cropped and converted to WebP.</>}
            </p>
            <a className="mt-2 inline-block text-sm underline" href={image.source} target="_blank" rel="noreferrer">View original source and attribution</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
