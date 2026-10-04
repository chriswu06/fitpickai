import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Outfit forms upload several photos through a server action (they're resized client-side first).
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    });
    return config;
  }
};

export default nextConfig;
