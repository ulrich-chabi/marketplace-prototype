import Image from "next/image"
import demoImages from "@/data/demo-images.json"

export function ProductImage({ title, imageKey, className = "", priority = false }: { title: string; imageKey?: string | null; className?: string; priority?: boolean }) {
  const image = imageKey ? demoImages[imageKey as keyof typeof demoImages] : undefined
  if (!image) return null
  return (
    <Image
      src={image.file}
      alt={image.alt || `Illustrative product photo for ${title}`}
      width={800}
      height={600}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      loading={priority ? "eager" : "lazy"}
      className={`aspect-[4/3] h-auto w-full rounded-xl object-cover ${className}`}
    />
  )
}
