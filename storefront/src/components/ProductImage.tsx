import Image from "next/image"
import demoImages from "@/data/demo-images.json"

export function ProductImage({ title, category, className = "", priority = false }: { title: string; category: string | null; className?: string; priority?: boolean }) {
  const image = demoImages[category as keyof typeof demoImages]
  return (
    <Image
      src={image?.file ?? "/images/catalog/electronics.webp"}
      alt={image?.alt ?? `Illustrative product photo for ${title}`}
      width={800}
      height={600}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      loading={priority ? "eager" : "lazy"}
      className={`aspect-[4/3] h-auto w-full rounded-xl object-cover ${className}`}
    />
  )
}
