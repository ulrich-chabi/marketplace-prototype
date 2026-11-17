import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  // Permet de bâtir une instance de vérification sans toucher au serveur local actif.
  distDir: process.env.STOREFRONT_BUILD_DIR || ".next",
  // Aucun en-tête révélant la technologie du serveur.
  poweredByHeader: false,
}

export default nextConfig
