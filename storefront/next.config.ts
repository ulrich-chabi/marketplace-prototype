import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Permet de bâtir une instance de vérification sans toucher au serveur local actif.
  distDir: process.env.STOREFRONT_BUILD_DIR || ".next",
  // Aucun en-tête révélant la technologie du serveur.
  poweredByHeader: false,
}

export default nextConfig
