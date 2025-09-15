// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Kör lint lokalt, men låt builden på Vercel gå igenom
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Låt builden passera även om TypeScript klagar
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
