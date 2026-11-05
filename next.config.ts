import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Permite que o build continue mesmo com avisos de linting
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite que o build continue mesmo com erros de tipagem
    ignoreBuildErrors: true,
  }
};

export default nextConfig;